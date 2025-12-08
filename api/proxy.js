// Vercel Serverless Function - API Proxy
// This function proxies all requests to the Azure backend API
// to bypass CORS restrictions

const BACKEND_URL = 'https://voltyks-dqh6fzgwdndrdng7.canadacentral-01.azurewebsites.net';

module.exports = async (req, res) => {
  // Set CORS headers first
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Extract the path from the URL
  // URL format: /api/proxy/api/Auth/Login -> should become /api/Auth/Login
  let apiPath = req.url;

  // Remove /api/proxy prefix if present
  if (apiPath.startsWith('/api/proxy')) {
    apiPath = apiPath.replace('/api/proxy', '');
  }

  // If path is empty, return error
  if (!apiPath || apiPath === '/') {
    return res.status(400).json({
      error: 'Missing API path',
      hint: 'Use /api/proxy/api/Auth/Login format'
    });
  }

  const targetUrl = `${BACKEND_URL}${apiPath}`;

  console.log(`[Proxy] ${req.method} ${req.url} -> ${targetUrl}`);

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
      fetchOptions.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }

    // Make the request to the backend
    const response = await fetch(targetUrl, fetchOptions);

    // Get response data
    const data = await response.text();

    // Set content type from response
    const contentType = response.headers.get('content-type');
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }

    console.log(`[Proxy] Response status: ${response.status}`);

    // Return the response
    res.status(response.status).send(data);

  } catch (error) {
    console.error('[Proxy] Error:', error);
    res.status(500).json({
      error: 'Proxy error',
      message: error.message,
      targetUrl
    });
  }
};
