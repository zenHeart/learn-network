const https = require('https');


// Send test POST request to httpbin.org
const postData = JSON.stringify({
   test: 'data',
   timestamp: new Date().toISOString()
});

const options = {
   hostname: 'httpbin.org',
   path: '/delay/2',
   method: 'POST',
   headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
   }
};

const req = https.request(options, (res) => {
   console.log(`Status: ${res.statusCode}`);

   let data = '';
   res.on('data', (chunk) => {
      data += chunk;
   });

   res.on('end', () => {
      console.log('Response received:', data);
   });
});

req.on('error', (err) => {
   console.error('Request error:', err.message);
});

req.write(postData);
req.end();