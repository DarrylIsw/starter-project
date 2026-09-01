/* eslint-disable no-await-in-loop */
const nodemailer = require('nodemailer');
const emailConfig = require('../config/email');
const db = require('../config/db');
const logger = require('../logger');
const outboxModel = require('../models/emailOutboxModel');
const templateService = require('./emailTemplateService');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_ENQUEUE_BATCH = 100;

const cleanText = (value, limit) => String(value || '')
  .replace(/\b(password|kata sandi|token|secret)\s*[:=]\s*\S+/gi, '$1: [disembunyikan]')
  .slice(0, limit)
  .trim();

const normalizeRecord = record => {
  const recipientEmail = String(record.recipientEmail || record.to || '').trim().toLowerCase();
  const deduplicationKey = cleanText(record.deduplicationKey, 500);
  const notificationType = cleanText(record.notificationType || record.type, 100);
  if (!EMAIL_PATTERN.test(recipientEmail) || !deduplicationKey || !notificationType) return null;
  const availableAt = new Date(record.availableAt || record.queuedAt || record.createdAt || Date.now());
  return {
    recipientUserId: cleanText(record.recipientUserId || record.userId, 120) || null,
    recipientEmail,
    subject: cleanText(record.subject || 'Pemberitahuan RIS', 240),
    bodyText: cleanText(record.bodyText || record.message || 'Ada pembaruan penting pada sistem RIS.', 12000),
    bodyHtml: null,
    templateKey: cleanText(record.templateKey, 100) || null,
    notificationType,
    entityType: cleanText(record.entityType, 100) || null,
    entityId: cleanText(record.entityId, 120) || null,
    actionPath: cleanText(record.actionPath, 1000) || null,
    priority: ['low', 'normal', 'high', 'critical'].includes(record.priority) ? record.priority : 'normal',
    deliveryMode: record.deliveryMode === 'digest' ? 'digest' : 'immediate',
    deduplicationKey,
    sourceEventId: cleanText(record.sourceEventId, 255) || null,
    payload: {
      recipientName: cleanText(record.payload && record.payload.recipientName, 180),
      actionPath: cleanText(record.payload && record.payload.actionPath, 1000),
      actionLabel: cleanText(record.payload && record.payload.actionLabel, 80),
      managerMode: cleanText(record.payload && record.payload.managerMode, 30),
    },
    availableAt: Number.isNaN(availableAt.getTime()) ? new Date().toISOString() : availableAt.toISOString(),
  };
};

const publicStatus = config => ({
  enabled: config.enabled,
  configured: config.missingConfiguration.length === 0,
  active: config.active,
  provider: config.provider,
  persistence: db.isDatabaseConfigured() ? 'postgresql' : 'memory',
  deliverySafety: config.redirectAllTo
    ? 'redirect'
    : (config.recipientAllowlist.length ? 'allowlist' : 'direct'),
  missingConfiguration: config.missingConfiguration,
});

const createEmailDeliveryService = ({
  config = emailConfig,
  model = outboxModel,
  templates = templateService,
  transportFactory = options => nodemailer.createTransport(options),
  log = logger,
} = {}) => {
  let transporter = null;
  let timer = null;
  let processing = false;

  const getTransporter = () => {
    if (!transporter) {
      const options = {
        host: config.smtp.host,
        port: config.smtp.port,
        secure: config.smtp.secure,
        pool: true,
        tls: { rejectUnauthorized: config.smtp.rejectUnauthorized },
      };
      if (config.smtp.user && config.smtp.password) {
        options.auth = { user: config.smtp.user, pass: config.smtp.password };
      }
      transporter = transportFactory(options);
    }
    return transporter;
  };

  const getDeliveryAddress = original => {
    if (config.redirectAllTo) return config.redirectAllTo;
    if (config.recipientAllowlist.length && !config.recipientAllowlist.includes(String(original).toLowerCase())) return '';
    return original;
  };

  const enqueue = async records => {
    if (!config.active) return { accepted: 0, cancelled: 0, active: false };
    const source = Array.isArray(records) ? records.slice(0, MAX_ENQUEUE_BATCH) : [];
    const cancelledKeys = source
      .filter(record => record && record.status === 'cancelled')
      .map(record => cleanText(record.deduplicationKey, 500))
      .filter(Boolean);
    const cancelled = await model.cancelByDeduplicationKeys(cancelledKeys);
    const normalized = source
      .filter(record => record && record.status !== 'cancelled')
      .map(normalizeRecord)
      .filter(Boolean);
    const additions = await model.enqueue(normalized);
    return { accepted: additions.length, cancelled, active: true };
  };

  const retryAt = attempts => {
    const exponent = Math.max(0, Math.min(attempts - 1, 10));
    const delay = Math.min(config.worker.retryBaseMs * (2 ** exponent), 24 * 60 * 60 * 1000);
    return new Date(Date.now() + delay).toISOString();
  };

  const deliverGroup = async records => {
    const ids = records.map(record => record.id);
    const to = getDeliveryAddress(records[0].recipientEmail);
    if (!to) {
      await model.markCancelled(ids, 'Recipient is not included in EMAIL_RECIPIENT_ALLOWLIST.');
      return { sent: 0, cancelled: ids.length, failed: 0 };
    }
    const content = records[0].deliveryMode === 'digest' && records.length > 1
      ? templates.renderDigest(records, config)
      : templates.renderImmediate(records[0], config);
    try {
      const info = await getTransporter().sendMail({
        from: config.from,
        replyTo: config.replyTo || undefined,
        to,
        subject: content.subject,
        text: content.text,
        html: content.html,
        headers: { 'X-RIS-Notification': records.map(record => record.notificationType).join(',').slice(0, 500) },
      });
      await model.markSent(ids, config.provider, info && info.messageId);
      log.info('email_delivery_succeeded', {
        count: ids.length,
        deliveryMode: records[0].deliveryMode,
        providerMessageId: info && info.messageId,
      });
      return { sent: ids.length, cancelled: 0, failed: 0 };
    } catch (error) {
      const highestAttempt = Math.max(...records.map(record => record.attempts || 1));
      await model.markFailed(ids, error.message, retryAt(highestAttempt));
      log.warn('email_delivery_failed', {
        count: ids.length,
        deliveryMode: records[0].deliveryMode,
        attempts: highestAttempt,
        terminal: highestAttempt >= config.worker.maxAttempts,
        error: { name: error.name, code: error.code, message: error.message },
      });
      return { sent: 0, cancelled: 0, failed: ids.length };
    }
  };

  const processBatch = async () => {
    if (!config.active || processing) {
      return {
        claimed: 0, sent: 0, failed: 0, cancelled: 0
      };
    }
    processing = true;
    try {
      const records = await model.claimDue(config.worker);
      const immediate = records.filter(record => record.deliveryMode !== 'digest').map(record => [record]);
      const digestMap = records.filter(record => record.deliveryMode === 'digest').reduce((groups, record) => {
        const key = record.recipientEmail.toLowerCase();
        groups.set(key, [...(groups.get(key) || []), record]);
        return groups;
      }, new Map());
      const groups = [...immediate, ...digestMap.values()];
      const summary = {
        claimed: records.length, sent: 0, failed: 0, cancelled: 0
      };
      for (let index = 0; index < groups.length; index += 1) {
        const result = await deliverGroup(groups[index]);
        summary.sent += result.sent;
        summary.failed += result.failed;
        summary.cancelled += result.cancelled;
      }
      return summary;
    } finally {
      processing = false;
    }
  };

  const getStatus = async includeSummary => ({
    ...publicStatus(config),
    outbox: includeSummary && config.active ? await model.getSummary() : undefined,
  });

  const verify = async () => {
    if (!config.active) return false;
    try {
      await getTransporter().verify();
      log.info('email_transport_ready', { provider: config.provider });
      return true;
    } catch (error) {
      log.warn('email_transport_unavailable', { error: { name: error.name, code: error.code, message: error.message } });
      return false;
    }
  };

  const start = () => {
    if (!config.active || timer) {
      if (!config.active) log.info('email_delivery_inactive', publicStatus(config));
      return false;
    }
    verify();
    processBatch().catch(error => log.error(error, { event: 'email_worker_cycle_failed' }));
    timer = setInterval(() => {
      processBatch().catch(error => log.error(error, { event: 'email_worker_cycle_failed' }));
    }, config.worker.pollIntervalMs);
    if (timer.unref) timer.unref();
    return true;
  };

  const stop = () => {
    if (timer) clearInterval(timer);
    timer = null;
    if (transporter && transporter.close) transporter.close();
    transporter = null;
  };

  return {
    enqueue,
    processBatch,
    getStatus,
    verify,
    start,
    stop,
  };
};

const emailDeliveryService = createEmailDeliveryService();

module.exports = emailDeliveryService;
module.exports.createEmailDeliveryService = createEmailDeliveryService;
module.exports.normalizeRecord = normalizeRecord;
module.exports.publicStatus = publicStatus;
