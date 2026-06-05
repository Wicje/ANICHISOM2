import express from 'express';
import next from 'next';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { parse } from 'url';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
  const server = express();
  const httpServer = createServer(server);
  
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  if (process.env.REDIS_URL) {
    console.log('Connecting to Redis for WebSockets...');
    const pubClient = createClient({ url: process.env.REDIS_URL });
    const subClient = pubClient.duplicate();
    await Promise.all([pubClient.connect(), subClient.connect()]);
    io.adapter(createAdapter(pubClient, subClient));
    console.log('Redis connected and adapter initialized.');
  }

  // Simple in-memory KV store for OS state syncing
  const rooms = new Map<string, any>();

  io.on('connection', (socket) => {
    socket.on('join-room', (roomId) => {
      socket.join(roomId);
      if (rooms.has(roomId)) {
        socket.emit('sync-state', rooms.get(roomId));
      }
    });

    socket.on('update-state', ({ roomId, state }) => {
      rooms.set(roomId, state);
      socket.to(roomId).emit('sync-state', state);
    });

    socket.on('cursor-move', ({ roomId, cursor }) => {
      socket.to(roomId).emit('cursor-update', { id: socket.id, ...cursor });
    });
    
    socket.on('add-comment', ({ roomId, comment }) => {
      socket.to(roomId).emit('comment-added', comment);
    });

    socket.on('disconnect', () => {
      io.emit('user-disconnected', socket.id);
    });
  });

  server.all(/.*/, (req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  httpServer.listen(3000, () => {
    console.log('> Ready on http://localhost:3000');
  });
});
