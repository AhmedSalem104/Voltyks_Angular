const http = require('http');

const BACKEND_HOST = 'voltyks-app.runasp.net';

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Get the API path from the URL
  const apiPath = req.url;

  return new Promise((resolve) => {
    const options = {
      hostname: BACKEND_HOST,
      port: 80,
      path: apiPath,
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    // Copy authorization header if present
    if (req.headers.authorization) {
      options.headers['Authorization'] = req.headers.authorization;
    }

    const proxyReq = http.request(options, (proxyRes) => {
      let data = '';

      proxyRes.on('data', (chunk) => {
        data += chunk;
      });

      proxyRes.on('end', () => {
        // Set response status and headers
        res.status(proxyRes.statusCode);

        // Copy content-type header
        if (proxyRes.headers['content-type']) {
          res.setHeader('Content-Type', proxyRes.headers['content-type']);
        }

        // Send response
        res.send(data);
        resolve();
      });
    });

    proxyReq.on('error', (error) => {
      console.error('Proxy error:', error);
      res.status(500).json({
        status: false,
        message: 'Proxy connection error',
        error: error.message
      });
      resolve();
    });

    // Forward request body for POST/PUT/PATCH
    if (req.body && ['POST', 'PUT', 'PATCH'].includes(req.method)) {
      const bodyData = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    }

    proxyReq.end();
  });
};
