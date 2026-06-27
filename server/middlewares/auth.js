const optionalUser = (req, res, next) => {
  req.user = req.get('x-user-id') ? {
    id: req.get('x-user-id'),
    role: req.get('x-user-role') || null,
  } : null;
  next();
};

const requireUser = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required.' });
  }
  return next();
};

module.exports = {
  optionalUser,
  requireUser,
};
