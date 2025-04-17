// Simple proxy for working around the content type issue
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

// Define proxied routes
app.all('/api/*', async (req, res) => {
  try {
    const url = `http://localhost:5000${req.url}`;
    const method = req.method;
    const headers = {...req.headers};
    delete headers.host;
    delete headers.connection;
    
    // Add JSON content type explicitly
    headers['content-type'] = 'application/json';
    headers['accept'] = 'application/json';
    
    // Log information for debugging
    console.log(`[PROXY] ${method} ${req.url}`);
    
    // Make the proxied request
    const response = await axios({
      method,
      url,
      data: method !== 'GET' ? req.body : undefined,
      headers,
      responseType: 'json'
    });
    
    res.status(response.status).json(response.data);
  } catch (error) {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error(`[ERROR] Status: ${error.response.status}, Data:`, error.response.data);
      res.status(error.response.status).json(error.response.data);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('[ERROR] No response received:', error.request);
      res.status(500).json({ error: 'No response from server' });
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('[ERROR]', error.message);
      res.status(500).json({ error: error.message });
    }
  }
});

const PORT = 5001;
app.listen(PORT, () => {
  console.log(`API Proxy running at http://localhost:${PORT}`);
  console.log('To use: curl http://localhost:5001/api/...');
});