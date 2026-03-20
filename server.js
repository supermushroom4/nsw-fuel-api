const https = require('https');

const NSW_AUTH    = process.env.NSW_AUTH;
const NSW_API_KEY = process.env.NSW_API_KEY;

function httpsPost(url) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, { method: 'POST', headers: {
      'Authorization': NSW_AUTH,
      'Content-Type': 'application/x-www-form-urlencoded',
    }}, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.end();
  });
}

function httpsGet(url, token) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, { method: 'GET', headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json',
      'apikey': NSW_API_KEY,
    }}, res => {
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

  if (url.pathname === '/prices') {
    const fuel   = url.searchParams.get('fuel')   || 'E10';
    const lat    = url.searchParams.get('lat');
    const lng    = url.searchParams.get('lng');
    const radius = url.searchParams.get('radius') || '10';
    try {
      const tokenRaw  = await httpsPost('https://api.onegov.nsw.gov.au/oauth/client_credential/accesstoken?grant_type=client_credentials');
      const tokenData = JSON.parse(tokenRaw);
      const token     = tokenData.access_token;
      if (!token) { res.writeHead(500); res.end(JSON.stringify({ error: 'No token', detail: tokenData })); return; }
      const prices = await httpsGet(`https://api.onegov.nsw.gov.au/FuelPriceCheck/v2/fuel/prices/nearby?fueltype=${fuel}&latitude=${lat}&longitude=${lng}&radius=${radius}&sortby=Price&ascending=true`, token);
      res.writeHead(200); res.end(prices);
    } catch(e) { res.writeHead(500); res.end(JSON.stringify({ error: e.message })); }
    return;
  }

  res.writeHead(200); res.end(JSON.stringify({ status: 'NSW Fuel API running' }));

}).listen(PORT, () => console.log('Server running on port ' + PORT));
