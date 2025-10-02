const { kv } = require('@vercel/kv');

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { filename } = req.query || {};
    if (!filename) return res.status(400).json({ error: 'Missing filename' });

    // Try KV first
    try {
      const rec = await kv.get(`file:${filename}`);
      if (rec && rec.results) {
        return res.status(200).json({ filename, results: rec.results });
      }
    } catch (_) {}

    return res.status(404).json({ error: 'No results found' });
  } catch (e) {
    console.error('results error', e);
    return res.status(500).json({ error: 'Failed to get results', message: e.message });
  }
};


