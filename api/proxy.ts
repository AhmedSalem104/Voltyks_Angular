import type { VercelRequest, VercelResponse } from '@vercel/node';
import http from 'http';

const BACKEND_HOST = 'voltyks-app.runasp.net';

export default async function handler(req: VercelRequest, res: VercelResponse) {
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

  // Get the API path from query parameter
  const pathParam = req.query.path;
  const apiPath = '/api/' + (Array.isArray(pathParam) ? pathParam.join('/') : pathParam || '');

  return new Promise<void>((resolve) => {
    const options: http.RequestOptions = {
      hostname: BACKEND_HOST,
      port: 80,
      path: apiPath,
      method: req.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    // Copy authorization header if present
    if (req.headers.authorization) {
      options.headers = { ...options.headers, 'Authorization': req.headers.authorization };
    }

    const proxyReq = http.request(options, (proxyRes) => {
      let data = '';

      proxyRes.on('data', (chunk) => {
        data += chunk;
      });

      proxyRes.on('end', () => {
        res.status(proxyRes.statusCode || 500);

        if (proxyRes.headers['content-type']) {
          res.setHeader('Content-Type', proxyRes.headers['content-type']);
        }

        res.send(data);
        resolve();
      });
    });

    proxyReq.on('error', (error) => {
      res.status(500).json({
        status: false,
        message: 'Proxy connection error',
        error: error.message
      });
      resolve();
    });

    // Forward request body for POST/PUT/PATCH
    if (req.body && ['POST', 'PUT', 'PATCH'].includes(req.method || '')) {
      const bodyData = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      proxyReq.write(bodyData);
    }

    proxyReq.end();
  });
}
