import { Session } from "../types/session";

class WebSocketService {
  private ws: WebSocket | null = null;
  private sessions: Map<string, Session> = new Map();
  private listeners: ((sessions: Session[]) => void)[] = [];

  constructor() {
    this.connect();
  }

  private connect() {
    this.ws = new WebSocket("ws://localhost:8080");

    this.ws.onopen = () => {
      console.log("Connected to analytics server");
      // Identify as dashboard
      this.ws?.send("dashboard_connect");
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "session_update") {
          const session: Session = {
            id: data.sessionId,
            startTime: new Date(data.timestamp).toISOString(),
            events: data.events || [],
            screenshotPath: data.screenshotPath || "",
            pageUrl: data.pageUrl || "",
            consoleLogs: data.consoleLogs || [],
            aiAnalysis: data.aiAnalysis || "",
          };

          console.log("Created session object:", session);
          this.sessions.set(session.id, session);
          this.notifyListeners();
        }
      } catch (error) {
        console.error("Error processing message:", error);
      }
    };

    this.ws.onclose = () => {
      console.log("Disconnected from analytics server");
      setTimeout(() => this.connect(), 1000);
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
    console.log("Notifying listeners with sessions:", sessions);
    this.listeners.forEach((listener) => listener(sessions));
  }
}

export const websocketService = new WebSocketService();
