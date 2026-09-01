const auditTrail = require('../services/auditTrailService');

const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];

module.exports = (req, res, next) => {
  if (!mutatingMethods.includes(req.method)) return next();

  res.on('finish', () => {
    const pathParts = req.path.split('/').filter(Boolean);
    auditTrail.record({
      requestId: req.requestId,
      userId: req.user && req.user.id,
      action: `${req.method.toLowerCase()}_${pathParts[0] || 'api_resource'}`,
      entityType: req.get('x-audit-entity') || pathParts[0] || 'api_resource',
      entityId: req.get('x-audit-entity-id') || pathParts[pathParts.length - 1],
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      body: req.body,
    }).catch(() => {});
  });

  return next();
};
