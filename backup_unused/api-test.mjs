import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Test API endpoint url
const API_URL = process.env.API_URL || 'https://affclm.replit.app';
const API_TOKEN = process.env.API_TOKEN || '45fcc47d347e08f4cf4cf871ba30afcbd3274fd23dec9c54ca3b4503ada60d60';

async function testApiEndpoint(endpoint, method = 'GET', data = null) {
  const url = `${API_URL}${endpoint}`;
  let command = `curl -s -X ${method} "${url}" -H "Authorization: Bearer ${API_TOKEN}" -H "Content-Type: application/json"`;
  
  if (data && method !== 'GET') {
    command += ` -d '${JSON.stringify(data)}'`;
  }
  
  try {
    console.log(`Testing ${method} ${url}...`);
    const { stdout, stderr } = await execAsync(command);
    
    if (stderr) {
      console.error(`Error: ${stderr}`);
      return null;
    }
    
    try {
      const response = JSON.parse(stdout);
      return response;
    } catch (e) {
      console.log('Raw response:', stdout);
      return { raw: stdout };
    }
  } catch (error) {
    console.error(`Error executing request: ${error.message}`);
    return null;
  }
}

async function runTests() {
  console.log(`\n=== Testing API at ${API_URL} ===\n`);
  
  // Test health check
  const healthCheck = await testApiEndpoint('/api/check');
  console.log('Health check result:', healthCheck || 'Failed');
  
  // Test top affiliates endpoint
  const topAffiliates = await testApiEndpoint('/api/affiliates/top');
  console.log('Top affiliates result:', topAffiliates || 'Failed');
  
  // Test admin affiliates list endpoint
  const adminAffiliates = await testApiEndpoint('/api/admin/affiliates');
  console.log('Admin affiliates result:', adminAffiliates || 'Failed');
  
  console.log('\n=== Test Complete ===\n');
}

runTests().catch(console.error);