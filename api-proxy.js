const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// Serve static files from the 'dist/public' directory
app.use(express.static(path.join(__dirname, 'dist/public')));

// Simple health check endpoint
app.get('/api/check', (req, res) => {
  res.json({ status: 'ok', message: 'API proxy is working' });
});

// Redirect API requests to your actual API server
app.all('/api/*', async (req, res) => {
  try {
    // Đây là đường dẫn đến API tạm thời, có thể điều chỉnh nếu cần
    // Local server sẽ chạy trên cổng khác
    const isProd = process.env.NODE_ENV === 'production';
    const backendUrl = isProd ? process.env.API_URL || 'https://affclm-api.replit.app' : 'http://localhost:3000';
    const method = req.method.toLowerCase();
    const url = `${backendUrl}${req.url}`;
    
    console.log(`Proxying ${method.toUpperCase()} request to: ${url}`);
    
    // Forward the request to the backend
    const response = await axios({
      method,
      url,
      data: req.body,
      headers: {
        ...req.headers,
        host: new URL(backendUrl).host,
      },
      validateStatus: () => true, // Accept any status code
    });
    
    // Set the response headers
    Object.entries(response.headers).forEach(([key, value]) => {
      res.set(key, value);
    });
    
    // Send the response
    res.status(response.status).send(response.data);
  } catch (error) {
    console.error('Proxy error:', error.message);
    res.status(502).json({
      error: 'Bad Gateway',
      message: 'Failed to connect to the backend server',
      details: error.message
    });
  }
});

// Serve the index.html for all other routes (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist/public/index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`API proxy server running on port ${PORT}`);
});