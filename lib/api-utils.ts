import { NextApiResponse } from 'next';
import { NextResponse } from 'next/server';

// For Pages Router
export const successResponse = (res: NextApiResponse, data: any, status = 200) => {
  return res.status(status).json({
    success: true,
    data,
  });
};

// For App Router
export const successResponseApp = (data: any, status = 200) => {
  return NextResponse.json({
    success: true,
    data,
  }, { status });
};

// For Pages Router
export const errorResponse = (res: NextApiResponse, message: string, status = 400) => {
  return res.status(status).json({
    success: false,
    error: message,
  });
};

// For App Router
export const errorResponseApp = (message: string, status = 400) => {
  return NextResponse.json({
    success: false,
    error: message,
  }, { status });
}; 