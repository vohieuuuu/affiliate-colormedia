const express = require('express');
const path = require('path');
const cors = require('cors');
const { execSync } = require('child_process');
const app = express();
const PORT = process.env.PORT || 5000;

// Này là một hack cho Replit để tạo ra thư mục dist/public nếu nó không tồn tại
try {
  execSync('mkdir -p dist/public');
  console.log('Created dist/public directory');
  
  // Kiểm tra nếu không có index.html, tạo một file tạm thời
  const distExists = require('fs').existsSync(path.join(__dirname, 'dist/public/index.html'));
  if (!distExists) {
    require('fs').writeFileSync(
      path.join(__dirname, 'dist/public/index.html'),
      '<html><body><h1>ColorMedia Affiliate API Server</h1><p>API is running. Frontend currently unavailable.</p></body></html>'
    );
    console.log('Created temporary index.html');
  }
} catch (error) {
  console.error('Error setting up folders:', error);
}

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname, 'dist/public')));

// Simple API route for health check
app.get('/api/check', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'ColorMedia Affiliate API is working', 
    environment: process.env.NODE_ENV || 'production',
    timestamp: new Date().toISOString()
  });
});

// Dummy API for testing affiliates
app.get('/api/affiliates/top', (req, res) => {
  res.json({ 
    status: 'success',
    data: [
      { name: 'Affiliate 1', email: 'affiliate1@example.com', totalCommission: 5000000 },
      { name: 'Affiliate 2', email: 'affiliate2@example.com', totalCommission: 4500000 },
      { name: 'Affiliate 3', email: 'affiliate3@example.com', totalCommission: 3800000 }
    ]
  });
});

// Admin API with authentication
app.get('/api/admin/affiliates', (req, res) => {
  // Kiểm tra authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      status: 'error', 
      error: { 
        code: 'INVALID_TOKEN',
        message: 'Invalid or missing authentication token' 
      } 
    });
  }
  
  const token = authHeader.split(' ')[1];
  // Token cố định dành cho admin
  if (token !== '45fcc47d347e08f4cf4cf871ba30afcbd3274fd23dec9c54ca3b4503ada60d60') {
    return res.status(401).json({ 
      status: 'error', 
      error: { 
        code: 'INVALID_TOKEN',
        message: 'Invalid authentication token' 
      } 
    });
  }
  
  // Trả về mock data
  res.json({ 
    status: 'success',
    data: [
      { 
        affiliate_id: 'AFF001', 
        name: 'Nguyen Van A', 
        email: 'affiliate1@colormedia.vn',
        phone: '0901234567',
        balance: 5000000,
        totalCommission: 6500000,
        contractsValue: 200000000,
        totalCustomers: 12,
        status: 'active'
      },
      { 
        affiliate_id: 'AFF002', 
        name: 'Tran Thi B', 
        email: 'affiliate2@colormedia.vn',
        phone: '0909876543',
        balance: 3200000,
        totalCommission: 4800000,
        contractsValue: 160000000,
        totalCustomers: 8,
        status: 'active'
      },
      { 
        affiliate_id: 'AFF003', 
        name: 'Le Hoang C', 
        email: 'affiliate3@colormedia.vn',
        phone: '0908765432',
        balance: 1500000,
        totalCommission: 3900000,
        contractsValue: 130000000,
        totalCustomers: 5,
        status: 'active'
      }
    ]
  });
});

// Catch all other routes and return the index file
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist/public/index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`ColorMedia Affiliate API server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'production'}`);
  console.log(`Check API health at: http://localhost:${PORT}/api/check`);
});