// Route segment config for API routes
// This increases the body size limit for API routes, particularly for file uploads

export const config = {
  api: {
    // Increase the body parser size limit for all API routes
    bodyParser: {
      sizeLimit: '10mb',
    },
    // Extend the response timeout for handling larger files
    responseLimit: false,
  },
}; 