const apiNotFound = (req, res) => {
  res.status(404).json({ message: 'API endpoint not found.' });
};

const errorHandler = (err, req, res, next) => { // eslint-disable-line no-unused-vars
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    message: err.message || 'Internal server error.',
    code: err.code || 'SERVER_ERROR',
  });
};

module.exports = {
  apiNotFound,
  errorHandler,
};
