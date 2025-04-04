import express from "express";
import { WebSocketServer, WebSocket } from "ws";
import LZString from "lz-string";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface AnalyticsPayload {
  sessionId: string;
  timestamp: number;
  events: any[];
  domSnapshot: string;
  consoleLogs: string[];
  pageUrl: string;
  assetUrls: string[];
}

class AnalyticsServer {
  private wss: WebSocketServer;
  private sessions: Map<
    string,
    {
      ws: WebSocket;
      data: AnalyticsPayload[];
      lastPing: number;
    }
  >;
  private pingInterval: NodeJS.Timeout | null = null;

  constructor(port: number) {
    const app = express();
    this.sessions = new Map();

    // Create WebSocket server
    this.wss = new WebSocketServer({ server: app.listen(port) });
    console.log(`Server listening on port ${port}`);

    // Setup WebSocket handlers
    this.setupWebSocketHandlers();

    // Start heartbeat check
    this.startHeartbeat();
  }

  private setupWebSocketHandlers() {
    this.wss.on("connection", (ws: WebSocket) => {
      console.log("New client connected");

      // Handle incoming messages
      ws.on("message", (data: Buffer) => {
        try {
          const decompressed = LZString.decompressFromBase64(data.toString());
          if (!decompressed) {
            console.error("Failed to decompress data");
            return;
          }

          const payload: AnalyticsPayload = JSON.parse(decompressed);
          this.handlePayload(ws, payload);
        } catch (error) {
          console.error("Error processing message:", error);
        }
      });

      // Handle client disconnection
      ws.on("close", () => {
        this.handleDisconnection(ws);
      });

      // Handle pings
      ws.on("pong", () => {
        const session = this.findSessionByWebSocket(ws);
        if (session) {
          const sessionData = this.sessions.get(session.sessionId);
          if (sessionData) {
            sessionData.lastPing = Date.now();
          }
        }
      });
    });
  }

  private handlePayload(ws: WebSocket, payload: AnalyticsPayload) {
    // Initialize session if it doesn't exist
    if (!this.sessions.has(payload.sessionId)) {
      this.sessions.set(payload.sessionId, {
        ws,
        data: [],
        lastPing: Date.now(),
      });
      console.log(`New session started: ${payload.sessionId}`);
    }

    // Update session data
    const session = this.sessions.get(payload.sessionId)!;
    session.data.push(payload);
    session.lastPing = Date.now();

    // Log payload summary
    this.logPayloadSummary(payload);

    // Save to temporary file
    this.saveSessionData(payload.sessionId);
  }

  private handleDisconnection(ws: WebSocket) {
    const session = this.findSessionByWebSocket(ws);
    if (session) {
      console.log(`Client disconnected: ${session.sessionId}`);
      this.sessions.delete(session.sessionId);
    }
  }

  private findSessionByWebSocket(ws: WebSocket): { sessionId: string } | null {
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.ws === ws) {
        return { sessionId };
      }
    }
    return null;
  }

  private startHeartbeat() {
    this.pingInterval = setInterval(() => {
      const now = Date.now();
      for (const [sessionId, session] of this.sessions.entries()) {
        // Check if client is still alive
        if (now - session.lastPing > 30000) {
          // 30 seconds timeout
          console.log(`Client ${sessionId} timed out`);
          session.ws.terminate();
          this.sessions.delete(sessionId);
          continue;
        }

        // Send ping
        session.ws.ping();
      }
    }, 10000); // Check every 10 seconds
  }

  private logPayloadSummary(payload: AnalyticsPayload) {
    console.log(`
Session ID: ${payload.sessionId}
Timestamp: ${new Date(payload.timestamp).toISOString()}
Events: ${payload.events.length}
Console Logs: ${payload.consoleLogs.length}
DOM Snapshot Size: ${payload.domSnapshot.length} bytes
Page URL: ${payload.pageUrl}
Asset URLs: ${payload.assetUrls.length}
        `);
  }

  private saveSessionData(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const dataDir = path.join(__dirname, "sessions");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir);
    }

    const filePath = path.join(dataDir, `${sessionId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(session.data, null, 2));
  }
}

// Start the server
const server = new AnalyticsServer(8080);
