const db = require('../config/db');

const listLetters = async () => {
  const result = await db.query('SELECT * FROM letter_requests ORDER BY created_at DESC NULLS LAST, id DESC');
  return result.rows;
};

module.exports = { listLetters };
