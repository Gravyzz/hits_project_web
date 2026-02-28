const http = require('http');
const fs = require('fs');
const path = require('path');

const DIST = path.join(__dirname, 'dist');
const MIME = {'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.avif':'image/avif','.svg':'image/svg+xml','.ico':'image/x-icon'};

http.createServer((req, res) => {
  let p = path.join(DIST, req.url === '/' ? 'index.html' : req.url);
  if (!fs.existsSync(p)) p = path.join(DIST, 'index.html');
  const ext = path.extname(p);
  res.writeHead(200, {'Content-Type': MIME[ext]||'application/octet-stream'});
  fs.createReadStream(p).pipe(res);
}).listen(3000, () => console.log('listening on 3000'));
