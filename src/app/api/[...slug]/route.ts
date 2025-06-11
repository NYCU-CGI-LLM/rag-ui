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
  
  const { pathname, search } = new URL(req.url);
  const slug = pathname.replace('/api/', '');
  const apiUrl = `${BACKEND_URL}/${slug}${search}`;
  
  console.log(`[API PROXY] ${req.method} ${pathname}${search}`);
  console.log(`[API PROXY] Target URL: ${apiUrl}`);
  console.log(`[API PROXY] Request headers:`, Object.fromEntries(req.headers.entries()));

  // Prepare headers for backend request
  const headers = new Headers(req.headers);
  headers.delete('host');
  headers.delete('x-forwarded-host');
  headers.delete('x-forwarded-for');
  headers.delete('x-forwarded-proto');
  headers.delete('content-length'); // Let fetch calculate this automatically

  try {
    let body: any = undefined;
    const contentType = req.headers.get('content-type') || '';
    
    console.log(`[API PROXY] Content-Type: ${contentType}`);
    console.log(`[API PROXY] Method: ${req.method}`);

    // Handle request body based on method and content type
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      if (contentType.includes('multipart/form-data')) {
        // For file uploads, pass FormData directly
        console.log(`[API PROXY] Handling multipart/form-data (file upload)`);
        try {
          const formData = await req.formData();
          console.log(`[API PROXY] FormData fields:`, Array.from(formData.keys()));
          
          // Log file information if present
          for (const [key, value] of formData.entries()) {
            if (value instanceof File) {
              console.log(`[API PROXY] File field '${key}': ${value.name} (${value.size} bytes, ${value.type})`);
            } else {
              console.log(`[API PROXY] Form field '${key}': ${value}`);
            }
          }
          
          body = formData;
          // Remove content-type header to let fetch set it with boundary
          headers.delete('content-type');
        } catch (error) {
          console.error(`[API PROXY] Error parsing FormData:`, error);
          throw new Error(`Failed to parse FormData: ${error}`);
        }
      } else if (contentType.includes('application/json')) {
        console.log(`[API PROXY] Handling JSON body`);
        try {
          const jsonData = await req.json();
          console.log(`[API PROXY] JSON body:`, jsonData);
          body = JSON.stringify(jsonData);
        } catch (error) {
          console.error(`[API PROXY] Error parsing JSON:`, error);
          throw new Error(`Failed to parse JSON: ${error}`);
        }
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        console.log(`[API PROXY] Handling form-urlencoded body`);
        try {
          body = await req.text();
          console.log(`[API PROXY] Form body length:`, body.length);
        } catch (error) {
          console.error(`[API PROXY] Error parsing form data:`, error);
          throw new Error(`Failed to parse form data: ${error}`);
        }
      } else {
        console.log(`[API PROXY] Handling raw body`);
        try {
          body = await req.text();
          console.log(`[API PROXY] Raw body length:`, body.length);
        } catch (error) {
          console.error(`[API PROXY] Error reading raw body:`, error);
          throw new Error(`Failed to read raw body: ${error}`);
        }
      }
    }

    console.log(`[API PROXY] Making backend request...`);
    const backendStartTime = Date.now();

    const response = await fetch(apiUrl, {
      method: req.method,
      headers: headers,
      body: body,
      // @ts-ignore - duplex is needed for streaming
      duplex: 'half',
    });

    const backendDuration = Date.now() - backendStartTime;
    console.log(`[API PROXY] Backend response: ${response.status} ${response.statusText} (${backendDuration}ms)`);
    console.log(`[API PROXY] Backend response headers:`, Object.fromEntries(response.headers.entries()));

    // Prepare response headers
    const responseHeaders = new Headers(response.headers);
    responseHeaders.delete('content-encoding');
    responseHeaders.delete('content-length');

    let responseData;
    const responseContentType = response.headers.get('content-type') || '';
    
    if (responseContentType.includes('application/json')) {
      console.log(`[API PROXY] Reading JSON response`);
      try {
        const jsonResponse = await response.json();
        console.log(`[API PROXY] JSON response:`, jsonResponse);
        responseData = JSON.stringify(jsonResponse);
      } catch (error) {
        console.error(`[API PROXY] Error parsing JSON response:`, error);
        responseData = await response.text();
        console.log(`[API PROXY] Fallback to text response:`, responseData);
      }
    } else {
      console.log(`[API PROXY] Reading binary/text response`);
      responseData = await response.arrayBuffer();
      console.log(`[API PROXY] Response data size:`, responseData.byteLength);
    }

    const totalDuration = Date.now() - startTime;
    console.log(`[API PROXY] Total request duration: ${totalDuration}ms`);

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