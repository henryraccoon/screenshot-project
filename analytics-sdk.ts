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
  consoleLogs: string[];
  pageUrl: string;
  assetUrls: string[];
}

class AnalyticsClient {
  private sessionId: string;
  private ws: WebSocket | null = null;
  private eventQueue: EventData[] = [];
  private consoleLogs: string[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnected = false;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
    this.initializeWebSocket();
    this.setupEventListeners();
    this.overrideConsoleMethods();
    this.startPeriodicCollection();
  }

  private initializeWebSocket() {
    this.ws = new WebSocket("wss://example.com/ws");

    this.ws.onopen = () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.flushQueue();
    };

    this.ws.onclose = () => {
      this.isConnected = false;
      this.attemptReconnect();
    };

    this.ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        this.initializeWebSocket();
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }

  private setupEventListeners() {
    const events = [
      "click",
      "scroll",
      "input",
      "change",
      "mousemove",
      "beforeunload",
    ];

    events.forEach((eventType) => {
      document.addEventListener(
        eventType,
        (e) => {
          const target = e.target as HTMLElement;
          if (!target) return;

          const eventData: EventData = {
            timestamp: Date.now(),
            type: eventType,
            target: {
              tag: target.tagName.toLowerCase(),
              id: target.id || "",
              classes: Array.from(target.classList),
              position: {
                x: target.getBoundingClientRect().x,
                y: target.getBoundingClientRect().y,
              },
            },
          };

          this.eventQueue.push(eventData);
        },
        { capture: true }
      );
    });
  }

  private overrideConsoleMethods() {
    const methods = ["log", "warn", "error", "info"];

    methods.forEach((method) => {
      const originalMethod = console[method as keyof Console];
      console[method as keyof Console] = (...args) => {
        this.consoleLogs.push(`[${method.toUpperCase()}] ${args.join(" ")}`);
        originalMethod.apply(console, args);
      };
    });
  }

  private collectAssetUrls(): string[] {
    const assets: string[] = [];

    // Collect image URLs
    document.querySelectorAll("img").forEach((img) => {
      const src = (img as HTMLImageElement).src;
      if (src) assets.push(src);
    });

    // Collect video URLs
    document.querySelectorAll("video source").forEach((video) => {
      const src = (video as HTMLSourceElement).src;
      if (src) assets.push(src);
    });

    // Collect iframe URLs
    document.querySelectorAll("iframe").forEach((iframe) => {
      const src = (iframe as HTMLIFrameElement).src;
      if (src) assets.push(src);
    });

    // Collect script URLs
    document.querySelectorAll("script").forEach((script) => {
      const src = (script as HTMLScriptElement).src;
      if (src) assets.push(src);
    });

    return assets;
  }

  private createPayload(): Payload {
    return {
      sessionId: this.sessionId,
      timestamp: Date.now(),
      events: this.eventQueue,
      domSnapshot: document.documentElement.outerHTML,
      consoleLogs: this.consoleLogs,
      pageUrl: window.location.href,
      assetUrls: this.collectAssetUrls(),
    };
  }

  private startPeriodicCollection() {
    setInterval(() => {
      const payload = this.createPayload();
      const compressedPayload = LZString.compressToBase64(
        JSON.stringify(payload)
      );

      if (this.isConnected && this.ws) {
        this.ws.send(compressedPayload);
        this.eventQueue = [];
        this.consoleLogs = [];
      }
    }, 5000);
  }

  private flushQueue() {
    if (this.eventQueue.length > 0) {
      const payload = this.createPayload();
      const compressedPayload = LZString.compressToBase64(
        JSON.stringify(payload)
      );

      if (this.ws && this.isConnected) {
        this.ws.send(compressedPayload);
        this.eventQueue = [];
        this.consoleLogs = [];
      }
    }
  }
}

// Create a module to properly scope the global augmentation
declare global {
  interface Window {
    initAnalyticsClient: (sessionId: string) => void;
  }
}

// Initialize the client
const initAnalyticsClient = (sessionId: string) => {
  new AnalyticsClient(sessionId);
};

// Export the initialization function
export { initAnalyticsClient };
