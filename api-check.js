/**
 * API kiểm tra cấu hình cho ColorMedia Affiliate System
 * File này giúp xác minh các cấu hình hiện tại của hệ thống
 */

const express = require('express');
const axios = require('axios');
const os = require('os');
const dotenv = require('dotenv');

// Khởi tạo app Express
const app = express();
const PORT = process.env.PORT || 3001;

// Đọc file .env
dotenv.config();

// Lấy thông tin môi trường
const getEnvironmentInfo = () => {
  return {
    nodeEnv: process.env.NODE_ENV || 'development',
    appEnv: process.env.APP_ENV || 'development',
    port: PORT,
    hostname: os.hostname(),
    platform: os.platform(),
    cpus: os.cpus().length,
    memory: {
      total: Math.round(os.totalmem() / (1024 * 1024 * 1024)) + ' GB',
      free: Math.round(os.freemem() / (1024 * 1024 * 1024)) + ' GB',
    },
    uptime: Math.round(os.uptime() / 3600) + ' giờ',
  };
};

// Lấy thông tin cấu hình URL
const getUrlConfig = () => {
  const apiUrl = process.env.API_URL || 'http://localhost:5000';
  const viteApiUrl = process.env.VITE_API_URL || '';
  const viteAppUrl = process.env.VITE_APP_URL || '';
  
  // Danh sách các origins được phép
  const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',') 
    : ['https://affclm.replit.app'];
  
  return {
    apiUrl,
    frontendApiUrl: viteApiUrl,
    appUrl: viteAppUrl,
    allowedOrigins,
  };
};

// Endpont kiểm tra cấu hình
app.get('/api/check', async (req, res) => {
  try {
    const environmentInfo = getEnvironmentInfo();
    const urlConfig = getUrlConfig();
    
    // Kiểm tra kết nối tới API backend (nếu khác với server hiện tại)
    let apiStatus = 'N/A';
    if (process.env.API_URL && process.env.API_URL !== `http://localhost:${PORT}`) {
      try {
        const response = await axios.get(`${process.env.API_URL}/api/check`, {
          timeout: 3000
        });
        apiStatus = response.status === 200 ? 'OK' : `Error: ${response.status}`;
      } catch (error) {
        apiStatus = `Error: ${error.message}`;
      }
    } else {
      apiStatus = 'Đang chạy trên cùng server';
    }
    
    // Trả về thông tin cấu hình
    res.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      environment: environmentInfo,
      urls: urlConfig,
      apiStatus,
      databaseConnected: !!process.env.DATABASE_URL || false,
      webhookUrl: process.env.WEBHOOK_URL || null,
    });
  } catch (error) {
    console.error('Lỗi kiểm tra cấu hình:', error);
    res.status(500).json({
      status: 'error',
      message: 'Lỗi khi kiểm tra cấu hình',
      error: error.message,
    });
  }
});

// Khởi động server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server kiểm tra đang chạy tại http://localhost:${PORT}/api/check`);
  });
}

// Export cho sử dụng trong server chính
module.exports = app;