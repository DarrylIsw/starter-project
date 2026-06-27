const db = require('../config/db');

const status = async (req, res) => {
  const payload = {
    status: 'ok',
    service: 'ris-website',
    database: {
      configured: db.isDatabaseConfigured(),
      connected: false,
    },
    timestamp: new Date().toISOString(),
  };

  if (!db.isDatabaseConfigured()) {
    return res.json(payload);
  }

  try {
    await db.query('SELECT 1');
    return res.json({ ...payload, database: { ...payload.database, connected: true } });
  } catch (error) {
    return res.status(503).json({
      ...payload,
      status: 'degraded',
      database: { ...payload.database, error: error.message },
    });
  }
};

module.exports = { status };
