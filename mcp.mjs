import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { io } from "socket.io-client";
import { randomUUID } from "crypto";

const server = new Server(
  {
    name: "continuaos-os",
    version: "2.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Connect to the OS Bridge — pass session token for auth (S-09)
const MCP_SESSION_TOKEN = process.env.ContinuaOS_SESSION_TOKEN || '';
const socket = io("http://localhost:3000", {
  path: "/api/socketio",
  auth: { token: MCP_SESSION_TOKEN },
});

// Wait for the Socket connection
socket.on("connect", () => {
   console.error("Connected to OS Bridge WebSocket");
});

// We need to wait for responses
const pendingRequests = new Map();

socket.on('mcp-response', (res) => {
  if (pendingRequests.has(res.id)) {
    const { resolve, reject } = pendingRequests.get(res.id);
    pendingRequests.delete(res.id);
    if (res.success) {
      resolve(res.result);
    } else {
      reject(new Error(res.error));
    }
  }
});

function sendToOS(method, params) {
  return new Promise((resolve, reject) => {
    const id = randomUUID();
    pendingRequests.set(id, { resolve, reject });
    socket.emit('mcp-request', { id, method, params });
    
    // Timeout
    setTimeout(() => {
      if (pendingRequests.has(id)) {
        pendingRequests.delete(id);
        reject(new Error('Timeout waiting for OS Bridge (Ensure your OS is open in a browser tab)'));
      }
    }, 15000);
  });
}

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "open_os_app",
        description: "Open an application window in the user's browser OS (e.g., 'code', 'files', 'browser', 'terminal')",
        inputSchema: {
          type: "object",
          properties: {
            appId: { type: "string", description: "The app ID (code, files, browser, etc.)" },
            title: { type: "string", description: "Optional window title" },
          },
          required: ["appId"],
        },
      },
      {
        name: "read_os_file",
        description: "Read a file directly from the user's browser internal OPFS storage",
        inputSchema: {
          type: "object",
          properties: {
            path: { type: "string", description: "Path to file in OPFS (e.g., 'src/index.tsx')" },
          },
          required: ["path"],
        },
      },
      {
        name: "write_os_file",
        description: "Write content directly to a file in the user's browser internal OPFS storage. Updates are reflected instantly on the UI.",
        inputSchema: {
          type: "object",
          properties: {
            path: { type: "string", description: "Path to file in OPFS (e.g., 'src/index.tsx')" },
            content: { type: "string", description: "Content to write" },
          },
          required: ["path", "content"],
        },
      }
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "open_os_app") {
      await sendToOS('openWindow', { appId: args.appId, title: args.title });
      return { content: [{ type: "text", text: `Successfully opened ${args.appId}` }] };
    } else if (name === "read_os_file") {
      const content = await sendToOS('readFS', { path: args.path });
      return { content: [{ type: "text", text: content || "" }] };
    } else if (name === "write_os_file") {
      await sendToOS('writeFS', { path: args.path, content: args.content });
      return { content: [{ type: "text", text: `Successfully wrote to ${args.path}` }] };
    } else {
      throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [{ type: "text", text: `Error: ${error.message}` }],
      isError: true,
    };
  }
});

async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("ContinuaOS OS MCP Server running on stdio");
}

run().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
