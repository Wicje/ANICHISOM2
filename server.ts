import express from 'express';
import next from 'next';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { parse } from 'url';
import { WebSocketServer } from 'ws';
// @ts-ignore
import { setupWSConnection } from 'y-websocket/bin/utils';
import { resolveSession } from './lib/session-store';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// S-05: Restrict CORS to known origins — never wildcard
const ALLOWED_ORIGINS = dev
  ? ['http://localhost:3000', 'http://127.0.0.1:3000']
  : (process.env.ALLOWED_ORIGINS?.split(',') || []);

app.prepare().then(async () => {
  const server = express();
  const httpServer = createServer(server);

  // y-websocket server for real-time collaboration
  const wss = new WebSocketServer({ port: 1234 });
  const wsConnections = new Map<string, number>(); // ip -> connection count
  const WS_MAX_CONNECTIONS_PER_IP = 10;

  wss.on('connection', (ws, req) => {
    const clientIp = (req.headers['x-forwarded-for'] as string) ||
                     (req.headers['x-client-ip'] as string) ||
                     req.socket.remoteAddress || 'unknown';
    const count = wsConnections.get(clientIp) || 0;
    if (count >= WS_MAX_CONNECTIONS_PER_IP) {
      ws.close(1008, 'Rate limit exceeded');
      return;
    }
    wsConnections.set(clientIp, count + 1);
    ws.on('close', () => {
      const c = wsConnections.get(clientIp) || 1;
      if (c <= 1) wsConnections.delete(clientIp);
      else wsConnections.set(clientIp, c - 1);
    });
    setupWSConnection(ws, req);
  });
  console.log('Yjs WebSocket Server listening on ws://localhost:1234');


  const io = new Server(httpServer, {
    cors: {
      origin: dev ? ALLOWED_ORIGINS : (origin, callback) => {
        // In production, validate against configured origins
        if (!origin || ALLOWED_ORIGINS.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      methods: ["GET", "POST"],
      credentials: true,
    }
  });

  // S-09: Auth middleware — reject connections without valid session
  io.use((socket, next) => {
    const sessionToken = socket.handshake.auth?.token ||
                         socket.handshake.query?.token;

    if (!sessionToken) {
      return next(new Error('Authentication required'));
    }

    const sessionData = resolveSession(sessionToken as string);
    if (!sessionData) {
      return next(new Error('Invalid or expired session'));
    }

    // Attach user data to socket for use in handlers
    socket.data.user = sessionData;
    next();
  });

  let pubClient: any = null;
  let subClient: any = null;

  if (process.env.REDIS_URL) {
    console.log('Connecting to Redis for WebSockets...');
    pubClient = createClient({ url: process.env.REDIS_URL });
    subClient = pubClient.duplicate();
    await Promise.all([pubClient.connect(), subClient.connect()]);
    io.adapter(createAdapter(pubClient, subClient));
    console.log('Redis connected and adapter initialized.');
  }

  // Simple in-memory KV store for OS state syncing
  const rooms = new Map<string, any>();

  io.on('connection', (socket) => {
    const user = socket.data.user;

    socket.on('join-room', async (roomId) => {
      socket.join(roomId);
      if (pubClient) {
        const stateStr = await pubClient.get(`room:${roomId}`);
        if (stateStr) {
          try {
            socket.emit('sync-state', JSON.parse(stateStr));
          } catch (e) {
            console.error('Error parsing room state', e);
          }
        }
      } else {
        if (rooms.has(roomId)) {
          socket.emit('sync-state', rooms.get(roomId));
        }
      }
    });

    socket.on('update-state', async ({ roomId, state }) => {
      if (pubClient) {
        await pubClient.set(`room:${roomId}`, JSON.stringify(state));
      } else {
        rooms.set(roomId, state);
      }
      socket.to(roomId).emit('sync-state', state);
    });

    socket.on('cursor-move', ({ roomId, cursor }) => {
      socket.to(roomId).emit('cursor-update', { id: socket.id, ...cursor });
    });

    socket.on('add-comment', ({ roomId, comment }) => {
      socket.to(roomId).emit('comment-added', comment);
    });

    // --- MCP Bridge (S-09: authenticated) ---
    socket.on('mcp-request', (data) => {
      // Only relay MCP requests from authenticated connections
      if (!user) return;
      socket.broadcast.emit('mcp-request', data);
    });

    socket.on('mcp-response', (data) => {
      // Only relay MCP responses from authenticated connections
      if (!user) return;
      socket.broadcast.emit('mcp-response', data);
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
