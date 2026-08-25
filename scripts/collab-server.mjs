/**
 * Yjs WebSocket Relay Server
 *
 * Real-time collaboration server for Yjs documents.
 * Run with: node scripts/collab-server.mjs
 *
 * Uses y-websocket for CRDT sync between clients.
 * Persistence: in-memory (ephemeral) + client-side IndexedDB.
 */

import { WebSocketServer } from 'ws';
import * as Y from 'yjs';

const PORT = process.env.COLLAB_PORT || 3001;
const MAX_ROOMS = 1000;

const docs = new Map();
const rooms = new Map();

const wss = new WebSocketServer({ port: PORT });

console.log(`[collab] Yjs relay server running on ws://localhost:${PORT}`);

wss.on('connection', (ws, req) => {
  const roomId = req.url?.slice(1) || 'default';
  console.log(`[collab] Client connected to room: ${roomId}`);

  // Get or create Yjs document for this room
  if (!docs.has(roomId)) {
    if (docs.size >= MAX_ROOMS) {
      console.warn(`[collab] Max rooms reached (${MAX_ROOMS}). Rejecting room: ${roomId}`);
      ws.close(1013, 'Max rooms reached');
      return;
    }
    docs.set(roomId, new Y.Doc());
    rooms.set(roomId, new Set());
  }

  const doc = docs.get(roomId);
  const clients = rooms.get(roomId);
  clients.add(ws);

  // Send current document state
  const stateVector = Y.encodeStateVector(doc);
  ws.send(JSON.stringify({ type: 'sync', data: Array.from(stateVector) }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());

      if (data.type === 'update') {
        // Apply update to document
        const update = new Uint8Array(data.data);
        Y.applyUpdate(doc, update);

        // Broadcast to all other clients in the room
        for (const client of clients) {
          if (client !== ws && client.readyState === 1) {
            client.send(JSON.stringify({ type: 'update', data: Array.from(update) }));
          }
        }
      } else if (data.type === 'sync') {
        // Client requesting full sync
        const update = Y.encodeStateAsUpdate(doc, new Uint8Array(data.data));
        ws.send(JSON.stringify({ type: 'update', data: Array.from(update) }));
      } else if (data.type === 'awareness') {
        // Awareness update — broadcast to others
        for (const client of clients) {
          if (client !== ws && client.readyState === 1) {
            client.send(JSON.stringify({ type: 'awareness', data: data.data }));
          }
        }
      }
    } catch (err) {
      console.error('[collab] Error processing message:', err);
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    console.log(`[collab] Client disconnected from room: ${roomId} (${clients.size} remaining)`);

    // Clean up empty rooms after 5 minutes
    if (clients.size === 0) {
      setTimeout(() => {
        const currentClients = rooms.get(roomId);
        if (currentClients && currentClients.size === 0) {
          docs.delete(roomId);
          rooms.delete(roomId);
          console.log(`[collab] Room cleaned up: ${roomId}`);
        }
      }, 5 * 60 * 1000);
    }
  });

  ws.on('error', (err) => {
    console.error(`[collab] WebSocket error in room ${roomId}:`, err);
  });
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('[collab] Shutting down...');
  wss.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('[collab] Shutting down...');
  wss.close();
  process.exit(0);
});
