import { WebSocketServer, WebSocket } from "ws";
import LZString from "lz-string";
import http from "http";

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
  private dashboardConnections: Set<WebSocket> = new Set();
  private sessions: Map<string, { ws: WebSocket; data: AnalyticsPayload[] }> =
    new Map();

  constructor(port: number) {
    const server = http.createServer();

    this.wss = new WebSocketServer({ server });

    this.wss.on("connection", (ws: WebSocket) => {
      ws.on("message", (data: Buffer) => {
        try {
          const message = data.toString();

          // Handle dashboard connection
          if (message === "dashboard_connect") {
            this.dashboardConnections.add(ws);

            // Send current sessions
            Array.from(this.sessions.values()).forEach((session) => {
              if (session.data[0]) {
                ws.send(
                  JSON.stringify({
                    type: "session_update",
                    ...session.data[0],
                  })
                );
              }
            });
            return;
          }

          // Handle SDK messages
          const decompressed = LZString.decompressFromBase64(message);
          if (!decompressed) return;

          const payload: AnalyticsPayload = JSON.parse(decompressed);

          // Store session
          if (!this.sessions.has(payload.sessionId)) {
            this.sessions.set(payload.sessionId, { ws, data: [] });
          }
          this.sessions.get(payload.sessionId)!.data.push(payload);

          // Broadcast to dashboard
          this.dashboardConnections.forEach((conn) => {
            if (conn.readyState === WebSocket.OPEN) {
              conn.send(
                JSON.stringify({
                  type: "session_update",
                  ...payload,
                })
              );
            }
          });
        } catch (error) {
          console.error("Error processing message:", error);
        }
      });

      ws.on("close", () => {
        this.dashboardConnections.delete(ws);
        for (const [sessionId, session] of this.sessions.entries()) {
          if (session.ws === ws) {
            this.sessions.delete(sessionId);
            break;
          }
        }
      });
    });

    server.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  }
}

new AnalyticsServer(8080);
