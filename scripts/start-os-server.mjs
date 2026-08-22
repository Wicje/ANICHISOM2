import next from 'next';
import http from 'http';

const dev = true;
const hostname = '127.0.0.1';
const port = 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

console.log('⏳ Preparing ContinuaOS Next.js application...');
app.prepare().then(() => {
  const server = http.createServer(async (req, res) => {
    try {
      await handle(req, res);
    } catch (err) {
      console.error('Request error:', err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  });

  server.listen(port, hostname, () => {
    console.log('✨ ContinuaOS Server is permanently running on http://127.0.0.1:3000');
  });
});
