// Servidor mínimo para el chat de Karla.
// Sirve index.html y reenvía los mensajes a la API de Anthropic usando la
// API key guardada en la variable de entorno ANTHROPIC_API_KEY, para que la
// key nunca llegue al navegador.
//
// Uso:  ANTHROPIC_API_KEY=sk-ant-... node server.js   (Node 18+)

const http = require('http');
const fs = require('fs');
const path = require('path');

const API_KEY = process.env.ANTHROPIC_API_KEY;
const PORT = process.env.PORT || 3000;
const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 1000;
const MAX_BODY_BYTES = 200 * 1024;

if (!API_KEY) {
  console.error('Falta la variable de entorno ANTHROPIC_API_KEY.');
  process.exit(1);
}

function sendJson(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('Mensaje demasiado grande'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function handleChat(req, res) {
  let payload;
  try {
    payload = JSON.parse(await readBody(req));
  } catch (err) {
    return sendJson(res, 400, { error: 'Petición inválida' });
  }

  const { system, messages } = payload || {};
  if (typeof system !== 'string' || !Array.isArray(messages)) {
    return sendJson(res, 400, { error: 'Petición inválida' });
  }

  try {
    // El modelo y el límite de tokens se fijan aquí, no en el navegador.
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({ model: MODEL, max_tokens: MAX_TOKENS, system, messages })
    });
    const text = await upstream.text();
    res.writeHead(upstream.status, { 'Content-Type': 'application/json' });
    res.end(text);
  } catch (err) {
    console.error('Error llamando a Anthropic:', err);
    sendJson(res, 502, { error: 'No se pudo contactar al servicio' });
  }
}

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api/chat') {
    return handleChat(req, res);
  }
  if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return fs.createReadStream(path.join(__dirname, 'index.html')).pipe(res);
  }
  res.writeHead(404);
  res.end('No encontrado');
});

server.listen(PORT, () => {
  console.log(`Chat de Karla en http://localhost:${PORT}`);
});
