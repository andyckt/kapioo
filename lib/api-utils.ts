import { NextApiResponse } from 'next';
import { NextResponse } from 'next/server';

/**
 * @deprecated Prefer `successJson` / `errorJson` from `@/lib/api`.
 */
// For Pages Router
export const successResponse = <T>(res: NextApiResponse, data: T, status = 200) => {
  return res.status(status).json({
    success: true,
    data,
  });
};

/**
 * @deprecated Prefer `successJson` from `@/lib/api`.
 */
// For App Router
export const successResponseApp = <T>(data: T, status = 200) => {
  return NextResponse.json({
    success: true,
    data,
  }, { status });
};

/**
 * @deprecated Prefer `errorJson` from `@/lib/api`.
 */
// For Pages Router
export const errorResponse = (res: NextApiResponse, message: string, status = 400) => {
  return res.status(status).json({
    success: false,
    error: message,
  });
};

/**
 * @deprecated Prefer `errorJson` from `@/lib/api`.
 */
// For App Router
export const errorResponseApp = (message: string, status = 400) => {
  return NextResponse.json({
    success: false,
    error: message,
  }, { status });
}; 