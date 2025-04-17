// api-test.mjs - runs tests against the API server
import axios from 'axios';

// Configuration
const API_URL = 'http://localhost:5000';
let authToken = '';

async function loginAndGetToken() {
  try {
    console.log('🔑 Logging in as admin...');
    const response = await axios.post(`${API_URL}/api/auth/login`, {
      username: 'admin@colormedia.vn',
      password: 'admin@123'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    authToken = response.data.data.token;
    console.log('✅ Login successful! Token:', authToken);
    return authToken;
  } catch (error) {
    console.error('❌ Login failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

async function testGetAffiliates() {
  try {
    console.log('\n🔍 Getting affiliates list...');
    const response = await axios.get(`${API_URL}/api/affiliates`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      responseType: 'json'
    });
    
    console.log('✅ Affiliates retrieved successfully:');
    console.log(JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('❌ Failed to get affiliates:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Headers:', error.response.headers);
    }
  }
}

async function testGetAffiliateById(affiliateId) {
  try {
    console.log(`\n🔍 Getting affiliate with ID ${affiliateId}...`);
    const response = await axios.get(`${API_URL}/api/affiliates/${affiliateId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      responseType: 'json'
    });
    
    console.log('✅ Affiliate retrieved successfully:');
    console.log(JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error(`❌ Failed to get affiliate ${affiliateId}:`, error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

async function testGetCustomers() {
  try {
    console.log('\n🔍 Getting customers list...');
    const response = await axios.get(`${API_URL}/api/customers`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      responseType: 'json'
    });
    
    console.log('✅ Customers retrieved successfully:');
    console.log(JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('❌ Failed to get customers:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

async function testCreateAffiliate() {
  try {
    console.log('\n🔧 Creating new affiliate...');
    const newAffiliate = {
      affiliate_id: "AFF108",
      full_name: "Võ Xuân Hiếu",
      email: "mutnhata@gmail.com",
      phone: "0375698447",
      bank_account: "661661212",
      bank_name: "VPBank",
      user_id: 3
    };
    
    const response = await axios.post(`${API_URL}/api/affiliates`, newAffiliate, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      responseType: 'json'
    });
    
    console.log('✅ Affiliate created successfully:');
    console.log(JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('❌ Failed to create affiliate:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

// Run all tests
async function runTests() {
  try {
    await loginAndGetToken();
    await testGetAffiliates();
    await testGetAffiliateById('AFF101');
    await testGetCustomers();
    await testCreateAffiliate();
    
    console.log('\n✅ All tests completed');
  } catch (error) {
    console.error('\n❌ Tests failed:', error.message);
  }
}

runTests();