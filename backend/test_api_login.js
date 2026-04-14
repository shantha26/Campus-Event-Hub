const axios = require('axios');

async function testLogin() {
  try {
    const res = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'monish@gmail.com',
      password: 'password123'
    });
    console.log('Success:', res.data);
  } catch (err) {
    console.error('Failure:', err.response ? err.response.data : err.message);
  }
}

testLogin();
