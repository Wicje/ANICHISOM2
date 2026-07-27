import express from 'express';
import next from 'next';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { parse } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import * as Y from 'yjs';
// @ts-ignore
import * as syncProtocol from 'y-protocols/sync';
// @ts-ignore
import * as awarenessProtocol from 'y-protocols/awareness';
// @ts-ignore
import * as encoding from 'lib0/encoding';
// @ts-ignore
import * as decoding from 'lib0/decoding';
import { resolveSession } from './lib/session-store';

// Feature gate: only run collab server when explicitly enabled
if (process.env.NEXT_PUBLIC_ENABLE_COLLAB !== 'true') {
  console.log('[server] Collaboration server disabled (NEXT_PUBLIC_ENABLE_COLLAB != true)');
  console.log('[server] Run with NEXT_PUBLIC_ENABLE_COLLAB=true to enable WebSocket collaboration');
  // Still start Next.js without the collab layer
}

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

  // Yjs document store — one doc per room name
  const docs = new Map<string, { doc: Y.Doc; awareness: awarenessProtocol.Awareness }>();
  const conns = new Map<WebSocket, { docName: string; encoder: encoding.Encoder }>();

  function getYDoc(docName: string) {
    let entry = docs.get(docName);
    if (!entry) {
      const doc = new Y.Doc();
      const awareness = new awarenessProtocol.Awareness(doc);
      awareness.setLocalState(null);
      entry = { doc, awareness };
      docs.set(docName, entry);
    }
    return entry;
  }

  const MSG_SYNC = 0;
  const MSG_AWARENESS = 1;

  function handleWSConnection(ws: WebSocket, docName: string) {
    const { doc, awareness } = getYDoc(docName);
    const encoder = encoding.createEncoder();
    conns.set(ws, { docName, encoder });

    // Send sync step 1
    encoding.writeVarUint(encoder, MSG_SYNC);
    syncProtocol.writeSyncStep1(encoder, doc);
    ws.send(encoding.toUint8Array(encoder));

    // Send current awareness states
    const awarenessEncoder = encoding.createEncoder();
    encoding.writeVarUint(awarenessEncoder, MSG_AWARENESS);
    const states = awareness.getStates();
    const awarenessUpdate = awarenessProtocol.encodeAwarenessUpdate(
      awareness,
      Array.from(states.entries()).filter(([id]) => id !== doc.clientID).map(([id]) => id)
    );
    encoding.writeVarUint8Array(awarenessEncoder, awarenessUpdate);
    ws.send(encoding.toUint8Array(awarenessEncoder));

    ws.on('message', (message: Buffer) => {
      try {
        const decoder = decoding.createDecoder(new Uint8Array(message));
        const messageType = decoding.readVarUint(decoder);

        switch (messageType) {
          case MSG_SYNC:
            syncProtocol.readSyncMessage(decoder, encoder, doc, null);
            break;
          case MSG_AWARENESS:
            awarenessProtocol.applyAwarenessUpdate(
              awareness,
              decoding.readVarUint8Array(decoder),
              doc
            );
            break;
        }
      } catch (err) {
        console.error('Yjs message error:', err);
      }
    });

    ws.on('close', () => {
      conns.delete(ws);
      // Clean up empty docs
      let hasConns = false;
      for (const [, c] of conns) {
        if (c.docName === docName) { hasConns = true; break; }
      }
      if (!hasConns) {
        doc.destroy();
        docs.delete(docName);
      }
    });
  }

  wss.on('connection', (ws, req) => {
    // Auth check: require valid session cookie
    const cookieHeader = req.headers.cookie || '';
    const sessionMatch = cookieHeader.match(/continuaos_session=([^;]+)/);
    const supabaseMatch = cookieHeader.match(/sb-[a-z0-9]+-auth-token=(eyJ[^;]+)/);
    const hasSession = (sessionMatch?.[1] && resolveSession(sessionMatch[1])) || supabaseMatch;
    if (!hasSession) {
      ws.close(1008, 'Authentication required');
      return;
    }

    const clientIp = req.socket.remoteAddress || 'unknown';
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

    // Extract doc name from URL path (e.g., /my-room-name)
    const docName = req.url?.slice(1)?.split('?')[0] || 'default';
    handleWSConnection(ws, docName);
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
    const [{ createClient }, { createAdapter }] = await Promise.all([
      import('redis'),
      import('@socket.io/redis-adapter'),
    ]);
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

  const proxyWss = new WebSocketServer({ noServer: true });
  httpServer.on('upgrade', (req, socket, head) => {
    const parsedUrl = parse(req.url || '', true);
    if (parsedUrl.pathname === '/api/proxy/ws') {
      const cookieHeader = req.headers.cookie || '';
      const sessionMatch = cookieHeader.match(/continuaos_session=([^;]+)/);
      const supabaseMatch = cookieHeader.match(/sb-[a-z0-9]+-auth-token=(eyJ[^;]+)/);
      const hasSession = (sessionMatch?.[1] && resolveSession(sessionMatch[1])) || supabaseMatch;
      
      if (!hasSession && process.env.NODE_ENV === 'production') {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }

      const targetUrl = parsedUrl.query.url as string;
      if (!targetUrl) {
        socket.destroy();
        return;
      }
      proxyWss.handleUpgrade(req, socket, head, (ws) => {
        try {
          const targetWs = new WebSocket(targetUrl);
          ws.on('message', (msg) => {
            if (targetWs.readyState === WebSocket.OPEN) targetWs.send(msg);
          });
          targetWs.on('open', () => {
             // connection established
          });
          targetWs.on('message', (msg) => {
            if (ws.readyState === WebSocket.OPEN) ws.send(msg);
          });
          ws.on('close', () => targetWs.close());
          targetWs.on('close', () => ws.close());
          targetWs.on('error', () => ws.close());
          ws.on('error', () => targetWs.close());
        } catch (e) {
          ws.close();
        }
      });
    }
  });

  server.all(/.*/, (req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  httpServer.listen(3000, () => {
    console.log('> Ready on http://localhost:3000');
  });
});
