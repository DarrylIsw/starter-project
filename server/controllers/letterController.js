const model = require('../models/letterModel');

const dbFallback = (res, error) => {
  if (error.code !== 'DB_NOT_CONFIGURED') throw error;
  return res.json({
    records: [],
    meta: {
      databaseConfigured: false,
      message: error.message,
    },
  });
};

const listLetters = async (req, res, next) => {
  try {
    const records = await model.listLetters();
    return res.json({ records });
  } catch (error) {
    try {
      return dbFallback(res, error);
    } catch (fallbackError) {
      return next(fallbackError);
    }
  }
};

module.exports = { listLetters };
