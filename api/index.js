// api/index.js
const addonInterface = require('../addon');

export default async function handler(req, res) {
  const url = req.url;

  // CORS headers for web compatibility
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const addon = addonInterface.getInterface();

    if (url === '/' || url === '/manifest.json') {
      return res.status(200).json(addon.manifest);
    }

    const catalogMatch = url.match(/^\/catalog\/([^/]+)\/([^/]+)(?:\/(.+))?\.json$/);
    if (catalogMatch) {
      const [, type, id, extraStr] = catalogMatch;
      const extra = extraStr ? JSON.parse(decodeURIComponent(extraStr)) : {};
      const catalog = addon.catalog.find(c => c.types.includes(type));
      if (!catalog) return res.status(404).json({ error: 'Catalog not found' });
      const result = await catalog.handler({ type, id, extra });
      return res.status(200).json(result);
    }

    const streamMatch = url.match(/^\/stream\/([^/]+)\/(.+)\.json$/);
    if (streamMatch) {
      const [, type, id] = streamMatch;
      const result = await addon.stream.handler({ type, id: decodeURIComponent(id) });
      return res.status(200).json(result);
    }

    const metaMatch = url.match(/^\/meta\/([^/]+)\/(.+)\.json$/);
    if (metaMatch) {
      const [, type, id] = metaMatch;
      const result = await addon.meta.handler({ type, id: decodeURIComponent(id) });
      return res.status(200).json(result);
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
