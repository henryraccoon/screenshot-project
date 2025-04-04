import { Session } from "../types/session";

class WebSocketService {
  private ws: WebSocket | null = null;
  private sessions: Map<string, Session> = new Map();
  private listeners: ((sessions: Session[]) => void)[] = [];
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isConnecting: boolean = false;

  constructor() {
    this.connect();
  }

  private connect() {
    if (this.isConnecting) return;
    this.isConnecting = true;

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.ws = new WebSocket("ws://localhost:8080");

    this.ws.onopen = () => {
      console.log("Connected to analytics server");
      this.isConnecting = false;
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
      // Identify as dashboard
      this.ws?.send("dashboard_connect");
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "session_update") {
          const sessionId = data.sessionId;
          const existingSession = this.sessions.get(sessionId);

          // Create new session data by merging with existing data
          const session: Session = {
            sessionId: data.sessionId,
            timestamp: data.timestamp,
            events: data.events || existingSession?.events || [],
            // Keep existing DOM snapshot and styles if not provided in update
            domSnapshot: data.domSnapshot || existingSession?.domSnapshot || "",
            styles: data.styles ||
              existingSession?.styles || { inline: [], computed: [] },
            pageUrl: data.pageUrl || existingSession?.pageUrl || "",
            consoleLogs: data.consoleLogs || existingSession?.consoleLogs || [],
            assetUrls: data.assetUrls || existingSession?.assetUrls || [],
          };

          // Update or add the session
          this.sessions.set(session.sessionId, session);
          this.notifyListeners();
        } else if (data.type === "sessions_list") {
          // Handle initial sessions list
          this.sessions.clear();
          data.sessions.forEach((session: Session) => {
            this.sessions.set(session.sessionId, session);
          });
          this.notifyListeners();
        }
      } catch (error) {
        console.error("Error processing message:", error);
      }
    };

    this.ws.onclose = () => {
      console.log("Disconnected from analytics server");
      this.isConnecting = false;
      // Only set a new reconnect timer if one isn't already set
      if (!this.reconnectTimer) {
        this.reconnectTimer = setTimeout(() => {
          this.reconnectTimer = null;
          this.connect();
        }, 1000);
      }
    };

    this.ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      this.isConnecting = false;
      if (this.ws) {
        this.ws.close();
        this.ws = null;
      }
    };
  }

  public subscribe(listener: (sessions: Session[]) => void) {
    this.listeners.push(listener);
    // Send initial data
    listener(Array.from(this.sessions.values()));
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners() {
    const sessions = Array.from(this.sessions.values());
    this.listeners.forEach((listener) => {
      try {
        listener(sessions);
      } catch (error) {
        console.error("Error in listener:", error);
      }
    });
  }
}

export const websocketService = new WebSocketService();
