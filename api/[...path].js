// Vercel Edge Function - API Proxy
// This proxies all /api/* requests to the backend

export const config = {
  runtime: 'edge',
};

const BACKEND_URL = 'http://voltyks-app.runasp.net';

export default async function handler(request) {
  const url = new URL(request.url);
  // Get the path after /api/
  const apiPath = url.pathname; // e.g., /api/Auth/Login

  const targetUrl = `${BACKEND_URL}${apiPath}`;

  console.log(`Proxying ${request.method} request to: ${targetUrl}`);

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    // Build headers to forward
    const headers = {
      'Content-Type': 'application/json',
    };

    // Forward Authorization header if present
    const authHeader = request.headers.get('Authorization');
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    // Build fetch options
    const fetchOptions = {
      method: request.method,
      headers,
    };

    // Add body for non-GET requests
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      try {
        const body = await request.text();
        if (body) {
          fetchOptions.body = body;
        }
      } catch (e) {
        // No body
      }
    }

    // Make the request to the backend
    const response = await fetch(targetUrl, fetchOptions);

    // Get response data
    const data = await response.text();

    // Build response headers
    const responseHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Set content type from response
    const contentType = response.headers.get('content-type');
    if (contentType) {
      responseHeaders['Content-Type'] = contentType;
    }

    // Return the response
    return new Response(data, {
      status: response.status,
      headers: responseHeaders,
    });

  } catch (error) {
    console.error('Proxy error:', error);
    return new Response(JSON.stringify({
      error: 'Proxy error',
      message: error.message,
      targetUrl
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}
