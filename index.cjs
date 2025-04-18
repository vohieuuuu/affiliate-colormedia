/**
 * ColorMedia Affiliate System - Production Server
 * File này được sử dụng cho môi trường production trên Replit
 * Giải quyết vấn đề 502 Bad Gateway khi triển khai
 */

const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const { execSync } = require('child_process');
const app = express();
const PORT = process.env.PORT || 5000;

// Cấu hình CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Xử lý JSON requests
app.use(express.json());

// ===== MOCK DATABASE (MEMORY STORAGE) =====
// Dữ liệu cho môi trường production khi không có database
const mockData = {
  affiliates: [
    { 
      affiliate_id: 'AFF001', 
      name: 'Nguyen Van A', 
      email: 'affiliate1@colormedia.vn',
      phone: '0901234567',
      balance: 5000000,
      totalCommission: 6500000,
      contractsValue: 200000000,
      totalCustomers: 12,
      status: 'active',
      created_at: '2023-01-15T08:30:00.000Z',
      bank_name: 'Vietcombank',
      bank_account_number: '1234567890',
      bank_account_holder: 'NGUYEN VAN A'
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
      status: 'active',
      created_at: '2023-02-20T10:15:00.000Z',
      bank_name: 'Techcombank',
      bank_account_number: '0987654321',
      bank_account_holder: 'TRAN THI B'
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
      status: 'active',
      created_at: '2023-03-10T14:45:00.000Z',
      bank_name: 'MB Bank',
      bank_account_number: '5678901234',
      bank_account_holder: 'LE HOANG C'
    }
  ],
  customers: [
    {
      customer_id: 'CUST001',
      affiliate_id: 'AFF001',
      name: 'Công ty TNHH ABC',
      email: 'info@abc.com',
      phone: '0287654321',
      contract_value: 50000000,
      commission: 1500000,
      status: 'Đã chốt hợp đồng',
      created_at: '2023-05-15T09:30:00.000Z'
    },
    {
      customer_id: 'CUST002',
      affiliate_id: 'AFF001',
      name: 'Công ty CP XYZ',
      email: 'contact@xyz.vn',
      phone: '0298765432',
      contract_value: 35000000,
      commission: 1050000,
      status: 'Đang tư vấn',
      created_at: '2023-06-20T11:15:00.000Z'
    }
  ],
  withdrawals: [
    {
      withdrawal_id: 'W001',
      affiliate_id: 'AFF001',
      amount: 2000000,
      status: 'Completed',
      requested_at: '2023-07-10T10:00:00.000Z',
      processed_at: '2023-07-11T14:30:00.000Z'
    },
    {
      withdrawal_id: 'W002',
      affiliate_id: 'AFF002',
      amount: 1500000,
      status: 'Pending',
      requested_at: '2023-07-15T15:45:00.000Z'
    }
  ],
  videos: [
    {
      id: 1,
      title: 'Color X - Introduction',
      description: 'Giới thiệu về dịch vụ Color X',
      url: 'https://www.youtube.com/watch?v=example1',
      thumbnail: 'https://example.com/thumbnails/colorx.jpg',
      view_count: 1250,
      created_at: '2023-04-10T08:00:00.000Z'
    },
    {
      id: 2,
      title: 'ColorMedia - Company Overview',
      description: 'Tổng quan về công ty ColorMedia',
      url: 'https://www.youtube.com/watch?v=example2',
      thumbnail: 'https://example.com/thumbnails/colormedia.jpg',
      view_count: 3450,
      created_at: '2023-03-20T09:15:00.000Z'
    }
  ]
};

// ===== STATIC FILES SERVING =====
// Phục vụ các tập tin tĩnh từ thư mục dist/public
try {
  if (!fs.existsSync(path.join(__dirname, 'dist/public'))) {
    console.log('Creating dist/public directory...');
    execSync('mkdir -p dist/public');
    
    // Kiểm tra nếu không có index.html, tạo một file tạm thời
    if (!fs.existsSync(path.join(__dirname, 'dist/public/index.html'))) {
      fs.writeFileSync(
        path.join(__dirname, 'dist/public/index.html'),
        '<html><body style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">' +
        '<h1 style="color: #07ADB8;">ColorMedia Affiliate API Server</h1>' +
        '<p>API server is running. Frontend application is not yet available in this URL.</p>' +
        '<p>Please visit the main application for the complete experience.</p>' +
        '<hr>' +
        '<h2>API Endpoints:</h2>' +
        '<ul>' +
        '<li><code>/api/check</code> - Server health check</li>' +
        '<li><code>/api/affiliates/top</code> - Get top affiliates</li>' +
        '<li><code>/api/admin/affiliates</code> - Get all affiliates (requires admin token)</li>' +
        '</ul>' +
        '</body></html>'
      );
      console.log('Created temporary index.html');
    }
  }
  
  app.use(express.static(path.join(__dirname, 'dist/public')));
  console.log('Static files serving enabled');
} catch (error) {
  console.error('Error setting up folders:', error);
}

// ===== API ROUTES =====

// 1. Health check API
app.get('/api/check', (req, res) => {
  res.json({ 
    status: 'success', 
    message: 'ColorMedia Affiliate API is working', 
    environment: process.env.NODE_ENV || 'production',
    timestamp: new Date().toISOString()
  });
});

// 2. Top affiliates API
app.get('/api/affiliates/top', (req, res) => {
  try {
    // Sắp xếp affiliates theo totalCommission giảm dần và lấy top 5
    const topAffiliates = [...mockData.affiliates]
      .sort((a, b) => b.totalCommission - a.totalCommission)
      .slice(0, 5)
      .map(affiliate => ({
        name: affiliate.name,
        email: affiliate.email,
        totalCommission: affiliate.totalCommission
      }));
    
    res.json({ 
      status: 'success',
      data: topAffiliates
    });
  } catch (error) {
    console.error('Error fetching top affiliates:', error);
    res.status(500).json({ 
      status: 'error', 
      error: { 
        code: 'SERVER_ERROR',
        message: 'Failed to retrieve top affiliates' 
      } 
    });
  }
});

// 3. Admin API - Danh sách tất cả affiliates (cần token xác thực)
app.get('/api/admin/affiliates', (req, res) => {
  try {
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
    
    // Trả về danh sách affiliates
    res.json({ 
      status: 'success',
      data: mockData.affiliates
    });
  } catch (error) {
    console.error('Error retrieving affiliates:', error);
    res.status(500).json({ 
      status: 'error', 
      error: { 
        code: 'SERVER_ERROR',
        message: 'Failed to retrieve affiliates' 
      } 
    });
  }
});

// 4. Admin API - Tạo mới affiliate
app.post('/api/admin/affiliates', (req, res) => {
  try {
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
    
    // Kiểm tra dữ liệu đầu vào
    const { name, email, phone, bank_name, bank_account_number, bank_account_holder } = req.body;
    
    if (!name || !email || !phone) {
      return res.status(400).json({
        status: 'error',
        error: {
          code: 'INVALID_INPUT',
          message: 'Missing required fields: name, email, phone'
        }
      });
    }
    
    // Kiểm tra email đã tồn tại chưa
    if (mockData.affiliates.some(a => a.email === email)) {
      return res.status(400).json({
        status: 'error',
        error: {
          code: 'DUPLICATE_EMAIL',
          message: 'An affiliate with this email already exists'
        }
      });
    }
    
    // Tạo affiliate mới
    const newAffiliateId = `AFF${String(mockData.affiliates.length + 1).padStart(3, '0')}`;
    const newAffiliate = {
      affiliate_id: newAffiliateId,
      name,
      email,
      phone,
      balance: 0,
      totalCommission: 0,
      contractsValue: 0,
      totalCustomers: 0,
      status: 'active',
      created_at: new Date().toISOString(),
      bank_name: bank_name || '',
      bank_account_number: bank_account_number || '',
      bank_account_holder: bank_account_holder || ''
    };
    
    // Thêm vào danh sách
    mockData.affiliates.push(newAffiliate);
    
    // Trả về kết quả
    res.status(201).json({
      status: 'success',
      message: 'Affiliate created successfully',
      data: newAffiliate
    });
    
  } catch (error) {
    console.error('Error creating affiliate:', error);
    res.status(500).json({ 
      status: 'error', 
      error: { 
        code: 'SERVER_ERROR',
        message: 'Failed to create affiliate' 
      } 
    });
  }
});

// 5. API videos - Lấy danh sách video
app.get('/api/videos', (req, res) => {
  try {
    res.json({
      status: 'success',
      data: mockData.videos
    });
  } catch (error) {
    console.error('Error fetching videos:', error);
    res.status(500).json({
      status: 'error',
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to retrieve videos'
      }
    });
  }
});

// 6. API lấy thông tin affiliate theo ID
app.get('/api/affiliates/:id', (req, res) => {
  try {
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
    
    const affiliateId = req.params.id;
    const affiliate = mockData.affiliates.find(a => a.affiliate_id === affiliateId);
    
    if (!affiliate) {
      return res.status(404).json({
        status: 'error',
        error: {
          code: 'NOT_FOUND',
          message: `Affiliate with ID ${affiliateId} not found`
        }
      });
    }
    
    // Lấy các khách hàng của affiliate này
    const customers = mockData.customers.filter(c => c.affiliate_id === affiliateId);
    
    // Lấy lịch sử rút tiền
    const withdrawals = mockData.withdrawals.filter(w => w.affiliate_id === affiliateId);
    
    res.json({
      status: 'success',
      data: {
        ...affiliate,
        customers,
        withdrawals
      }
    });
  } catch (error) {
    console.error(`Error fetching affiliate details:`, error);
    res.status(500).json({
      status: 'error',
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to retrieve affiliate details'
      }
    });
  }
});

// ===== CATCH-ALL ROUTE =====
// Phục vụ index.html cho tất cả các routes khác (cần thiết cho SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist/public/index.html'));
});

// ===== START SERVER =====
app.listen(PORT, '0.0.0.0', () => {
  console.log(`ColorMedia Affiliate API server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'production'}`);
  console.log(`Server started at: ${new Date().toISOString()}`);
  console.log(`Check API at: http://localhost:${PORT}/api/check`);
});