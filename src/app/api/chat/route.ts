import { NextRequest, NextResponse } from 'next/server';

// Ensure you have this environment variable set, or replace it with your actual backend URL
const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://localhost:8000'; // Default to localhost:8000 if not set

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const query = body.query;
    const resultColumn = body.result_column || "generated_texts";

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const response = await fetch(`${PYTHON_BACKEND_URL}/v1/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: query,
        result_column: resultColumn,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Error from Python backend:', errorData);
      return NextResponse.json({ error: `Error from backend: ${response.statusText}`, details: errorData }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('Error in API route:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
} 