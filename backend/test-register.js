const axios = require('axios');
axios.post('http://localhost:5001/api/auth/register', {
  name: 'Test Setup',
  email: 'test' + Math.random() + '@example.com',
  password: 'password123'
}).then(res => console.log('OK:', res.data)).catch(err => console.log('ERR:', err.response?.data || err.message));
