/* eslint-disable no-await-in-loop */
const crypto = require('crypto');
const db = require('../config/db');

const memoryOutbox = new Map();
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isUuid = value => uuidPattern.test(String(value || ''));
const makeUuid = () => {
  const hex = crypto.randomBytes(16).toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20)}`;
};

const fromRow = row => ({
  id: row.id,
  recipientUserId: row.recipient_user_id,
  recipientEmail: row.recipient_email,
  subject: row.subject,
  bodyText: row.body_text,
  bodyHtml: row.body_html,
  templateKey: row.template_key,
  notificationType: row.notification_type,
  entityType: row.entity_type,
  entityId: row.entity_id,
  actionPath: row.action_path,
  priority: row.priority,
  deliveryMode: row.delivery_mode,
  deduplicationKey: row.deduplication_key,
  sourceEventId: row.source_event_id,
  payload: row.payload || {},
  status: row.status,
  attempts: Number(row.attempts || 0),
  availableAt: row.available_at,
  lockedAt: row.locked_at,
  sentAt: row.sent_at,
  errorMessage: row.error_message,
  provider: row.provider,
  providerMessageId: row.provider_message_id,
  lastAttemptAt: row.last_attempt_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const insertSql = `
  INSERT INTO email_outbox (
    recipient_user_id, recipient_email, subject, body_text, body_html,
    template_key, notification_type, entity_type, entity_id, action_path,
    priority, delivery_mode, deduplication_key, source_event_id, payload,
    status, attempts, available_at
  ) VALUES (
    $1, $2, $3, $4, $5,
    $6, $7, $8, $9, $10,
    $11, $12, $13, $14, $15::jsonb,
    'queued', 0, $16
  )
  ON CONFLICT (deduplication_key) DO NOTHING
  RETURNING *
`;

const insertParams = record => [
  isUuid(record.recipientUserId) ? record.recipientUserId : null,
  record.recipientEmail,
  record.subject,
  record.bodyText,
  record.bodyHtml || null,
  record.templateKey || null,
  record.notificationType,
  record.entityType || null,
  isUuid(record.entityId) ? record.entityId : null,
  record.actionPath || null,
  record.priority,
  record.deliveryMode,
  record.deduplicationKey,
  record.sourceEventId || null,
  JSON.stringify(record.payload || {}),
  record.availableAt,
];

const enqueue = async records => {
  if (!db.isDatabaseConfigured()) {
    const additions = [];
    records.forEach(record => {
      if (memoryOutbox.has(record.deduplicationKey)) return;
      const now = new Date().toISOString();
      const addition = {
        ...record, id: makeUuid(), status: 'queued', attempts: 0, createdAt: now, updatedAt: now
      };
      memoryOutbox.set(record.deduplicationKey, addition);
      additions.push(addition);
    });
    return additions;
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const additions = [];
    for (let index = 0; index < records.length; index += 1) {
      const result = await client.query(insertSql, insertParams(records[index]));
      if (result.rows[0]) additions.push(fromRow(result.rows[0]));
    }
    await client.query('COMMIT');
    return additions;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const cancelByDeduplicationKeys = async keys => {
  if (!keys.length) return 0;
  if (!db.isDatabaseConfigured()) {
    let changed = 0;
    keys.forEach(key => {
      const record = memoryOutbox.get(key);
      if (!record || !['queued', 'failed'].includes(record.status)) return;
      memoryOutbox.set(key, {
        ...record, status: 'cancelled', lockedAt: null, updatedAt: new Date().toISOString()
      });
      changed += 1;
    });
    return changed;
  }
  const result = await db.query(
    `UPDATE email_outbox SET status = 'cancelled', locked_at = NULL, updated_at = now()
     WHERE deduplication_key = ANY($1::varchar[]) AND status IN ('queued', 'failed')`,
    [keys]
  );
  return result.rowCount;
};

const claimDue = async ({ batchSize, maxAttempts, staleLockMinutes }) => {
  if (!db.isDatabaseConfigured()) {
    const now = Date.now();
    return [...memoryOutbox.values()]
      .filter(record => ['queued', 'failed'].includes(record.status)
        && record.attempts < maxAttempts
        && new Date(record.availableAt).getTime() <= now)
      .sort((left, right) => new Date(left.availableAt) - new Date(right.availableAt))
      .slice(0, batchSize)
      .map(record => {
        const claimed = {
          ...record, status: 'processing', attempts: record.attempts + 1, lockedAt: new Date().toISOString(), lastAttemptAt: new Date().toISOString()
        };
        memoryOutbox.set(record.deduplicationKey, claimed);
        return claimed;
      });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE email_outbox
       SET status = 'failed', locked_at = NULL, error_message = 'Worker lock expired', updated_at = now()
       WHERE status = 'processing' AND locked_at < now() - ($1::text || ' minutes')::interval`,
      [staleLockMinutes]
    );
    const result = await client.query(
      `WITH due AS (
         SELECT id FROM email_outbox
         WHERE status IN ('queued', 'failed')
           AND attempts < $1
           AND available_at <= now()
         ORDER BY
           CASE priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END,
           available_at,
           created_at
         FOR UPDATE SKIP LOCKED
         LIMIT $2
       )
       UPDATE email_outbox AS outbox
       SET status = 'processing', attempts = outbox.attempts + 1,
           locked_at = now(), last_attempt_at = now(), updated_at = now()
       FROM due
       WHERE outbox.id = due.id
       RETURNING outbox.*`,
      [maxAttempts, batchSize]
    );
    await client.query('COMMIT');
    return result.rows.map(fromRow);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const updateMemory = (ids, updater) => {
  const idSet = new Set(ids);
  memoryOutbox.forEach((record, key) => {
    if (idSet.has(record.id)) memoryOutbox.set(key, updater(record));
  });
};

const markSent = async (ids, provider, providerMessageId) => {
  if (!ids.length) return;
  if (!db.isDatabaseConfigured()) {
    updateMemory(ids, record => ({
      ...record, status: 'sent', provider, providerMessageId, sentAt: new Date().toISOString(), lockedAt: null, errorMessage: null
    }));
    return;
  }
  await db.query(
    `UPDATE email_outbox
     SET status = 'sent', provider = $2, provider_message_id = $3,
         sent_at = now(), locked_at = NULL, error_message = NULL, updated_at = now()
     WHERE id = ANY($1::uuid[])`,
    [ids, provider, providerMessageId || null]
  );
};

const markFailed = async (ids, errorMessage, availableAt) => {
  if (!ids.length) return;
  const message = String(errorMessage || 'Email delivery failed').slice(0, 2000);
  if (!db.isDatabaseConfigured()) {
    updateMemory(ids, record => ({
      ...record, status: 'failed', errorMessage: message, availableAt, lockedAt: null, updatedAt: new Date().toISOString()
    }));
    return;
  }
  await db.query(
    `UPDATE email_outbox
     SET status = 'failed', error_message = $2, available_at = $3,
         locked_at = NULL, updated_at = now()
     WHERE id = ANY($1::uuid[])`,
    [ids, message, availableAt]
  );
};

const markCancelled = async (ids, reason) => {
  if (!ids.length) return;
  const message = String(reason || 'Delivery cancelled').slice(0, 2000);
  if (!db.isDatabaseConfigured()) {
    updateMemory(ids, record => ({
      ...record, status: 'cancelled', errorMessage: message, lockedAt: null, updatedAt: new Date().toISOString()
    }));
    return;
  }
  await db.query(
    `UPDATE email_outbox
     SET status = 'cancelled', error_message = $2, locked_at = NULL, updated_at = now()
     WHERE id = ANY($1::uuid[])`,
    [ids, message]
  );
};

const getSummary = async () => {
  if (!db.isDatabaseConfigured()) {
    return [...memoryOutbox.values()].reduce((summary, record) => ({
      ...summary,
      total: summary.total + 1,
      [record.status]: (summary[record.status] || 0) + 1,
    }), {
      total: 0, queued: 0, processing: 0, sent: 0, failed: 0, cancelled: 0
    });
  }
  const result = await db.query('SELECT status, count(*)::integer AS total FROM email_outbox GROUP BY status');
  return result.rows.reduce((summary, row) => ({ ...summary, [row.status]: row.total, total: summary.total + row.total }), {
    total: 0, queued: 0, processing: 0, sent: 0, failed: 0, cancelled: 0
  });
};

const resetMemory = () => memoryOutbox.clear();

module.exports = {
  enqueue,
  cancelByDeduplicationKeys,
  claimDue,
  markSent,
  markFailed,
  markCancelled,
  getSummary,
  resetMemory,
};
