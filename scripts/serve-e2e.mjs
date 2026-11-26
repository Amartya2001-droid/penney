// Reproduce Pages' project prefix and custom-404 SPA fallback, including HTTP 404.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
const root = resolve(process.env.E2E_SERVE_DIR || 'dist-e2e');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon', '.ttf': 'font/ttf' };
const fallback = await readFile(resolve(root, 'index.html'));
createServer(async (req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  if (!path.startsWith('/penney/')) { res.writeHead(404); res.end(); return; }
  const file = resolve(root, decodeURIComponent(path.slice('/penney/'.length)) || 'index.html');
  if (!file.startsWith(root + sep)) { res.writeHead(403); res.end(); return; }
  try {
    if (!(await stat(file)).isFile()) throw new Error('Not a file');
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' }); res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/html' }); res.end(fallback);
  }
}).listen(8765, '127.0.0.1');
