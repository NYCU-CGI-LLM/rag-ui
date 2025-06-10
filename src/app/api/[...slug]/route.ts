import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.API_SERVER_URL;

async function handler(req: NextRequest) {
  const { pathname, search } = new URL(req.url);
  const slug = pathname.replace('/api/', '');
  const apiUrl = `${BACKEND_URL}/${slug}${search}`;

  const headers = new Headers(req.headers);
  headers.delete('host');
  headers.delete('x-forwarded-host');


  try {
    // Parse and prepare request body only for methods other than GET/HEAD
    let body: any = undefined;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const contentType = req.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        body = JSON.stringify(await req.json());
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        body = await req.text();
      } else {
        // Fallback: pass through raw body stream
        body = await req.text();
      }
    }
    const response = await fetch(apiUrl, {
      method: req.method,
      headers: headers,
      body: body,
      // @ts-ignore
      duplex: 'half',
    });

    const responseHeaders = new Headers(response.headers);
    responseHeaders.delete('content-encoding');
    responseHeaders.delete('content-length');

    const data = await response.arrayBuffer();

    return new NextResponse(data, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
    });

  } catch (error) {
    console.error('API proxy error:', error);
    return NextResponse.json({ error: 'API proxy error' }, { status: 500 });
  }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const PATCH = handler;
export const HEAD = handler;
export const OPTIONS = handler; 