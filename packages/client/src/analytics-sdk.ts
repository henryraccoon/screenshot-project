// Import lz-string for compression
declare const LZString: {
  compressToBase64: (str: string) => string;
};

interface EventData {
  timestamp: number;
  type: string;
  target: {
    tag: string;
    id: string;
    classes: string[];
    position: {
      x: number;
      y: number;
    };
  };
}

interface Payload {
  sessionId: string;
  timestamp: number;
  events: EventData[];
  domSnapshot: string;
  pageUrl: string;
}

export class AnalyticsClient {
  private sessionId: string;
  private ws: WebSocket | null = null;
  private eventQueue: EventData[] = [];
  private updateInterval: number = 1000; // Send updates every second
  private reconnectTimeout: any = null;

  constructor() {
    this.sessionId = Date.now() + "-" + Math.random().toString(36).substring(2);
    this.connect();
    this.setupEventListeners();
    this.startPeriodicCollection();
  }

  private connect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.ws = new WebSocket("ws://localhost:8080");

    this.ws.onopen = () => {
      console.log("Analytics WebSocket connected");
      this.sendUpdate();
    };

    this.ws.onclose = () => {
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
      }
      this.reconnectTimeout = setTimeout(() => this.connect(), 1000);
    };

    this.ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };
  }

  private sendUpdate() {
    if (this.ws?.readyState !== WebSocket.OPEN) return;

    const payload: Payload = {
      sessionId: this.sessionId,
      timestamp: Date.now(),
      events: this.eventQueue,
      domSnapshot: document.documentElement.outerHTML,
      pageUrl: window.location.href,
    };

    try {
      this.ws.send(LZString.compressToBase64(JSON.stringify(payload)));
      this.eventQueue = [];
    } catch (error) {
      console.error("Failed to send data:", error);
    }
  }

  private setupEventListeners() {
    const importantEvents = ["click", "change", "submit", "input"];

    importantEvents.forEach((eventType) => {
      document.addEventListener(
        eventType,
        (e) => {
          const target = e.target;
          if (!target || !(target instanceof HTMLElement)) return;

          this.eventQueue.push({
            timestamp: Date.now(),
            type: eventType,
            target: {
              tag: target.tagName.toLowerCase(),
              id: target.id,
              classes: Array.from(target.classList),
              position: {
                x: e instanceof MouseEvent ? e.clientX : 0,
                y: e instanceof MouseEvent ? e.clientY : 0,
              },
            },
          });

          // Send update immediately for important events
          this.sendUpdate();
        },
        true
      );
    });

    // Always capture page unload
    window.addEventListener("beforeunload", () => {
      this.eventQueue.push({
        timestamp: Date.now(),
        type: "beforeunload",
        target: {
          tag: "window",
          id: "",
          classes: [],
          position: { x: 0, y: 0 },
        },
      });
      this.sendUpdate();
    });
  }

  private startPeriodicCollection() {
    setInterval(() => this.sendUpdate(), this.updateInterval);
  }
}

// Initialize the SDK
const initAnalyticsClient = () => {
  if (!(window as any)._analyticsClient) {
    (window as any)._analyticsClient = new AnalyticsClient();
  }
};

(window as any).initAnalyticsClient = initAnalyticsClient;

// Auto-initialize if requested
if (document.currentScript?.hasAttribute("data-auto-init")) {
  initAnalyticsClient();
}
