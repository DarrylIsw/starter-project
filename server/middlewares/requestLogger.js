const logger = require('../logger');

module.exports = (req, res, next) => {
  const started = Date.now();
  res.on('finish', () => {
    if (process.env.NODE_ENV !== 'test') {
      logger.info('http_request_completed', {
        requestId: req.requestId,
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs: Date.now() - started,
        userId: req.user && req.user.id,
        userAgent: req.get('user-agent'),
        ip: req.ip,
      });
    }
  });
  next();
};
