const errorTracker = require('../observability/errorTracker');

const apiNotFound = (req, res) => {
  res.status(404).json({ message: 'API endpoint not found.', requestId: req.requestId });
};

const errorHandler = (err, req, res, next) => { // eslint-disable-line no-unused-vars
  const status = err.status || err.statusCode || 500;
  const eventId = errorTracker.captureException(err, {
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl,
    userId: req.user && req.user.id,
    statusCode: status,
  });
  res.status(status).json({
    message: err.message || 'Internal server error.',
    code: err.code || 'SERVER_ERROR',
    requestId: req.requestId,
    eventId,
  });
};

module.exports = {
  apiNotFound,
  errorHandler,
};
