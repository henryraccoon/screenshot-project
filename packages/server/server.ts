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
  styles?: {
    inline: string[];
    computed: Array<{
      selector: string;
      styles: { [key: string]: string };
    }>;
  };
}

class AnalyticsServer {
  private wss: WebSocketServer;
  private dashboardConnections: Set<WebSocket> = new Set();
  private sessions: Map<string, { ws: WebSocket; data: AnalyticsPayload }> =
    new Map();

  constructor(port: number) {
    const server = http.createServer((req, res) => {
      if (req.url === "/health") {
        res.writeHead(200);
        res.end("OK");
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    this.wss = new WebSocketServer({ server, perMessageDeflate: false });

    this.wss.on("connection", (ws: WebSocket) => {
      console.log("New connection established");

      ws.on("message", (data: Buffer) => {
        try {
          const message = data.toString();

          // Handle dashboard connection
          if (message === "dashboard_connect") {
            console.log("Dashboard connected");
            this.dashboardConnections.add(ws);

            // Send all current sessions to the new dashboard
            const sessions = Array.from(this.sessions.values()).map(
              (s) => s.data
            );
            ws.send(
              JSON.stringify({
                type: "sessions_list",
                sessions,
              })
            );
            return;
          }

          // Handle SDK messages
          const decompressed = LZString.decompressFromBase64(message);
          if (!decompressed) {
            console.error("Failed to decompress message");
            return;
          }

          const payload: AnalyticsPayload = JSON.parse(decompressed);
          console.log(`Received update for session ${payload.sessionId}`);

          // Get existing session data
          const existingSession = this.sessions.get(payload.sessionId);

          // Merge with existing session data if it exists
          const mergedData: AnalyticsPayload = {
            ...payload,
            // Keep existing DOM snapshot if not provided in update
            domSnapshot:
              payload.domSnapshot || existingSession?.data.domSnapshot || "",
            // Keep existing styles if not provided in update
            styles: payload.styles || existingSession?.data.styles,
            // Merge events arrays
            events: [
              ...(existingSession?.data.events || []),
              ...(payload.events || []),
            ],
            // Merge console logs
            consoleLogs: [
              ...(existingSession?.data.consoleLogs || []),
              ...(payload.consoleLogs || []),
            ],
            // Keep existing asset URLs if not provided in update
            assetUrls:
              payload.assetUrls || existingSession?.data.assetUrls || [],
          };

          // Update session
          this.sessions.set(payload.sessionId, { ws, data: mergedData });

          // Broadcast to all connected dashboards
          const updateMessage = JSON.stringify({
            type: "session_update",
            ...mergedData,
          });

          this.dashboardConnections.forEach((conn) => {
            if (conn.readyState === WebSocket.OPEN) {
              try {
                conn.send(updateMessage);
              } catch (error) {
                console.error("Error sending to dashboard:", error);
                // Remove dead connection
                this.dashboardConnections.delete(conn);
              }
            } else {
              // Remove dead connection
              this.dashboardConnections.delete(conn);
            }
          });
        } catch (error) {
          console.error("Error processing message:", error);
        }
      });

      // Handle connection close
      ws.on("close", () => {
        console.log("Connection closed");
        // Remove from dashboard connections
        this.dashboardConnections.delete(ws);

        // Remove any sessions associated with this connection
        for (const [sessionId, session] of this.sessions.entries()) {
          if (session.ws === ws) {
            console.log(`Removing session ${sessionId}`);
            this.sessions.delete(sessionId);
          }
        }
      });

      // Handle connection errors
      ws.on("error", (error) => {
        console.error("WebSocket error:", error);
        ws.close();
      });
    });

    // Start the server
    server.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });

    // Periodic cleanup of dead connections
    setInterval(() => {
      this.dashboardConnections.forEach((conn) => {
        if (conn.readyState !== WebSocket.OPEN) {
          this.dashboardConnections.delete(conn);
        }
      });
    }, 30000);
  }
}

new AnalyticsServer(8080);
