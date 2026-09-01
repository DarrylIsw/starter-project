const logger = require('../logger');

const captureException = (error, context = {}) => {
  const eventId = `${context.requestId || 'server'}_${Date.now()}`;
  logger.error(error, { event: 'captured_exception', eventId, ...context });

  // Production integration point: replace this adapter with Sentry, Datadog,
  // New Relic, or another provider without changing the error middleware.
  return eventId;
};

module.exports = { captureException };
