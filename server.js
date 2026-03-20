const https = require('https');

const NSW_AUTH    = process.env.NSW_AUTH;
const NSW_API_KEY = process.env.NSW_API_KEY;

function httpsPost(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Authorization': NSW_AUTH,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': 0,
      }
    };
    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data, headers: res.headers }));
    });
    req.on('error', reject);
    req.end();
  });
}

function httpsGet(url, token) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
        'apikey': NSW_API_KEY,
      }
    };
    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.end();
  });
}

const http = require('http');
const PORT = process.env.PORT || 3000;

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  if (url.pathname === '/test') {
    try {
      const result = await httpsPost('https://api.onegov.nsw.gov.au/oauth/client_credential/accesstoken?grant_type=client_credentials');
      res.writeHead(200);
      res.end(JSON.stringify({
        status: result.status,
        body: result.body,
        auth_set: !!NSW_AUTH,
        auth_preview: NSW_AUTH ? NSW_AUTH.substring(0,15)+'...' : 'NOT SET',
        apikey_set: !!NSW_API_KEY,
      }));
    } catch(e) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  if (url.pathname === '/prices') {
    const fuel   = url.searchParams.get('fuel')   || 'E10';
    const lat    = url.searchParams.get('lat');
    const lng    = url.searchParams.get('lng');
    const radius = url.searchParams.get('radius') || '10';
    try {
      const result    = await httpsPost('https://api.onegov.nsw.gov.au/oauth/client_credential/accesstoken?grant_type=client_credentials');
      const tokenData = JSON.parse(result.body);
      const token     = tokenData.access_token;
      if (!token) { res.writeHead(500); res.end(JSON.stringify({ error: 'No token', detail: tokenData })); return; }
      const prices = await httpsGet(`https://api.onegov.nsw.gov.au/FuelPriceCheck/v2/fuel/prices/nearby?fueltype=${fuel}&latitude=${lat}&longitude=${lng}&radius=${radius}&sortby=Price&ascending=true`, token);
      res.writeHead(200); res.end(prices);
    } catch(e) { res.writeHead(500); res.end(JSON.stringify({ error: e.message })); }
    return;
  }

  res.writeHead(200); res.end(JSON.stringify({ status: 'NSW Fuel API running' }));

}).listen(PORT, () => console.log('Server running on port ' + PORT));
