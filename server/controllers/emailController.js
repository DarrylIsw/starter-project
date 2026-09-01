const emailDeliveryService = require('../services/emailDeliveryService');

const status = async (req, res, next) => {
  try {
    return res.json(await emailDeliveryService.getStatus(true));
  } catch (error) {
    return next(error);
  }
};

const enqueue = async (req, res, next) => {
  try {
    const result = await emailDeliveryService.enqueue(req.body && req.body.records);
    return res.status(202).json(result);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  status,
  enqueue,
};
