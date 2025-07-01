import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.API_SERVER_URL;

if (!BACKEND_URL) {
  console.error('[API PROXY] ERROR: API_SERVER_URL environment variable is not set');
  console.error('[API PROXY] Please set API_SERVER_URL in your .env.local file');
  console.error('[API PROXY] Example: API_SERVER_URL=http://localhost:8000');
}

async function handler(req: NextRequest) {
  const startTime = Date.now();
  
  // Check if backend URL is configured
  if (!BACKEND_URL) {
    console.error('[API PROXY] Backend URL not configured');
    return NextResponse.json({ 
      error: 'Backend server not configured', 
      details: 'API_SERVER_URL environment variable is not set',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }

  // Log the incoming request headers
  // console.log('[API PROXY] Incoming request headers:');
  // for (const [key, value] of req.headers.entries()) {
  //   console.log(`${key}: ${value}`);
  // }

  const { pathname, search } = new URL(req.url);
  let slug = pathname.replace('/api/', '');
  
  // Handle FastAPI routing requirements - add trailing slash for specific endpoints
  // This fixes browser URL normalization that removes trailing slashes
  const endpointsThatNeedTrailingSlash = [
    'eval/benchmarks',
    'library',
    'chat',
    'retriever',
    'config',
    'parser',
    'chunker',
    'indexer'
  ];
  
  const shouldAddTrailingSlash = endpointsThatNeedTrailingSlash.some(endpoint => 
    slug === endpoint || slug === `${endpoint}/`
  );
  
  if (shouldAddTrailingSlash && !slug.endsWith('/')) {
    slug = `${slug}/`;
  }
  
  const apiUrl = `${BACKEND_URL}/${slug}${search}`;
  
  // // Debug logging
  // console.log(`[API PROXY] Request: ${req.method} ${req.url}`);
  // console.log(`[API PROXY] Pathname: ${pathname}`);
  // console.log(`[API PROXY] Slug: ${slug}`);
  // console.log(`[API PROXY] Target URL: ${apiUrl}`);

  // Prepare headers for backend request
  const headers = new Headers(req.headers);
  headers.delete('host');
  headers.delete('x-forwarded-host');
  headers.delete('x-forwarded-for');
  headers.delete('x-forwarded-proto');
  headers.delete('content-length'); // Let fetch calculate this automatically
  headers.delete('connection');

  try {
    let body: string | FormData | undefined = undefined;
    const contentType = req.headers.get('content-type') || '';

    // Handle request body based on method and content type
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      if (contentType.includes('multipart/form-data')) {
        // For file uploads, pass FormData directly
        try {
          const formData = await req.formData();
          body = formData;
          // Remove content-type header to let fetch set it with boundary
          headers.delete('content-type');
        } catch (error) {
          console.error(`[API PROXY] Error parsing FormData:`, error);
          throw new Error(`Failed to parse FormData: ${error}`);
        }
      } else if (contentType.includes('application/json')) {
        try {
          const jsonData = await req.json();
          body = JSON.stringify(jsonData);
        } catch (error) {
          console.error(`[API PROXY] Error parsing JSON:`, error);
          throw new Error(`Failed to parse JSON: ${error}`);
        }
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        try {
          body = await req.text();
        } catch (error) {
          console.error(`[API PROXY] Error parsing form data:`, error);
          throw new Error(`Failed to parse form data: ${error}`);
        }
      } else {
        try {
          body = await req.text();
        } catch (error) {
          console.error(`[API PROXY] Error reading raw body:`, error);
          throw new Error(`Failed to read raw body: ${error}`);
        }
      }
    }

    const response = await fetch(apiUrl, {
      method: req.method,
      headers: headers,
      body: body,
      // @ts-expect-error - duplex is needed for streaming
      duplex: 'half',
    });

    // Prepare response headers
    const responseHeaders = new Headers(response.headers);
    responseHeaders.delete('content-encoding');
    responseHeaders.delete('content-length');

    // Handle 204 No Content responses
    if (response.status === 204) {
      return new NextResponse(null, {
        status: 204,
        statusText: response.statusText,
        headers: responseHeaders,
      });
    }

    let responseData;
    const responseContentType = response.headers.get('content-type') || '';
    
    if (responseContentType.includes('application/json')) {
      try {
        const jsonResponse = await response.json();
        responseData = JSON.stringify(jsonResponse);
      } catch (error) {
        console.error(`[API PROXY] Error parsing JSON response:`, error);
        responseData = await response.text();
      }
    } else {
      responseData = await response.arrayBuffer();
    }

    return new NextResponse(responseData, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });

  } catch (error) {
    const totalDuration = Date.now() - startTime;
    console.error(`[API PROXY ERROR] Request failed after ${totalDuration}ms:`, error);
    console.error(`[API PROXY ERROR] Error details:`, {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      url: apiUrl,
      method: req.method,
      contentType: req.headers.get('content-type'),
    });

    // Return a proper error response
    return NextResponse.json({ 
      error: 'API proxy error', 
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
      url: apiUrl,
      method: req.method
    }, { status: 500 });
  }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const PATCH = handler;
export const HEAD = handler;
export const OPTIONS = handler; 