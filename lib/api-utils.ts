import { NextApiResponse } from 'next';

export const successResponse = (res: NextApiResponse, data: any, status = 200) => {
  return res.status(status).json({
    success: true,
    data,
  });
};

export const errorResponse = (res: NextApiResponse, message: string, status = 400) => {
  return res.status(status).json({
    success: false,
    error: message,
  });
}; 