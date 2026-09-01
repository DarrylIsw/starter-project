const asBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value).trim().toLowerCase() === 'true';
};

const asPositiveInteger = (value, fallback) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const splitList = value => String(value || '')
  .split(',')
  .map(item => item.trim().toLowerCase())
  .filter(Boolean);

const enabled = asBoolean(process.env.EMAIL_ENABLED, false);
const environment = process.env.NODE_ENV || 'development';
const smtpUser = String(process.env.SMTP_USER || '').trim();
const smtpPassword = String(process.env.SMTP_PASSWORD || '');
const redirectAllTo = String(process.env.EMAIL_REDIRECT_ALL_TO || '').trim().toLowerCase();
const recipientAllowlist = splitList(process.env.EMAIL_RECIPIENT_ALLOWLIST);

const config = {
  enabled,
  environment,
  provider: 'smtp',
  from: String(process.env.EMAIL_FROM || '').trim(),
  replyTo: String(process.env.EMAIL_REPLY_TO || '').trim(),
  appBaseUrl: String(process.env.APP_BASE_URL || 'http://localhost:3001').replace(/\/$/, ''),
  brandName: String(process.env.EMAIL_BRAND_NAME || 'Research Information System').trim(),
  supportEmail: String(process.env.EMAIL_SUPPORT_ADDRESS || process.env.EMAIL_REPLY_TO || '').trim(),
  redirectAllTo,
  recipientAllowlist,
  smtp: {
    host: String(process.env.SMTP_HOST || '').trim(),
    port: asPositiveInteger(process.env.SMTP_PORT, 587),
    secure: asBoolean(process.env.SMTP_SECURE, false),
    user: smtpUser,
    password: smtpPassword,
    rejectUnauthorized: asBoolean(process.env.SMTP_TLS_REJECT_UNAUTHORIZED, true),
  },
  worker: {
    pollIntervalMs: asPositiveInteger(process.env.EMAIL_WORKER_POLL_MS, 30000),
    batchSize: Math.min(asPositiveInteger(process.env.EMAIL_WORKER_BATCH_SIZE, 25), 100),
    maxAttempts: Math.min(asPositiveInteger(process.env.EMAIL_MAX_ATTEMPTS, 5), 20),
    retryBaseMs: asPositiveInteger(process.env.EMAIL_RETRY_BASE_MS, 60000),
    staleLockMinutes: Math.min(asPositiveInteger(process.env.EMAIL_STALE_LOCK_MINUTES, 15), 120),
  },
};

const missingConfiguration = [];
if (!config.smtp.host) missingConfiguration.push('SMTP_HOST');
if (!config.from) missingConfiguration.push('EMAIL_FROM');
if (Boolean(config.smtp.user) !== Boolean(config.smtp.password)) {
  missingConfiguration.push(config.smtp.user ? 'SMTP_PASSWORD' : 'SMTP_USER');
}
if (environment !== 'production' && !redirectAllTo && !recipientAllowlist.length) {
  missingConfiguration.push('EMAIL_REDIRECT_ALL_TO atau EMAIL_RECIPIENT_ALLOWLIST');
}

const active = enabled && missingConfiguration.length === 0;

module.exports = {
  ...config,
  active,
  missingConfiguration,
};
