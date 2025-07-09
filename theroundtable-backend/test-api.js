const axios = require('axios');

async function testApi() {
  try {
    const response = await axios.get('http://localhost:5001/api/characters');
    console.log('Number of characters:', response.data.length);
    console.log('First character:', JSON.stringify(response.data[0], null, 2));
    console.log('Last character:', JSON.stringify(response.data[response.data.length - 1], null, 2));
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

testApi(); 