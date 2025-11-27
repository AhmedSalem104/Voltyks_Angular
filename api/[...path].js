// Vercel Serverless Function - API Proxy
// This proxies all /api/* requests to the backend

const BACKEND_URL = 'http://voltyks-app.runasp.net';

export default async function handler(req, res) {
  // Get the path after /api/
  const { path } = req.query;
  const apiPath = Array.isArray(path) ? path.join('/') : path;

  const targetUrl = `${BACKEND_URL}/api/${apiPath}`;

  console.log(`Proxying ${req.method} request to: ${targetUrl}`);

  try {
    // Build headers to forward
    const headers = {
      'Content-Type': 'application/json',
    };

    // Forward Authorization header if present
    if (req.headers.authorization) {
      headers['Authorization'] = req.headers.authorization;
    }

    // Build fetch options
    const fetchOptions = {
      method: req.method,
      headers,
    };

    // Add body for non-GET requests
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      fetchOptions.body = JSON.stringify(req.body);
    }

    // Make the request to the backend
    const response = await fetch(targetUrl, fetchOptions);

    // Get response data
    const data = await response.text();

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    // Set content type from response
    const contentType = response.headers.get('content-type');
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }

    // Return the response
    res.status(response.status).send(data);

  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({
      error: 'Proxy error',
      message: error.message,
      targetUrl
    });
  }
}
