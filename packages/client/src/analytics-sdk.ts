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

export class AnalyticsClient {
  private sessionId: string;
  private ws: WebSocket | null = null;
  private eventQueue: EventData[] = [];
  private consoleLogs: string[] = [];

  constructor() {
    this.sessionId = Date.now() + "-" + Math.random().toString(36).substring(2);
    this.connect();
    this.setupEventListeners();
    this.overrideConsoleMethods();
    this.startPeriodicCollection();
  }

  private connect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.ws = new WebSocket("ws://localhost:8080");

    this.ws.onopen = () => {
      this.sendQueuedData();
    };

    this.ws.onclose = () => {
      setTimeout(() => this.connect(), 1000);
    };
  }

  private sendQueuedData() {
    if (this.eventQueue.length === 0 && this.consoleLogs.length === 0) return;

    const payload = {
      sessionId: this.sessionId,
      timestamp: Date.now(),
      events: this.eventQueue,
      domSnapshot: document.documentElement.outerHTML,
      consoleLogs: this.consoleLogs,
      pageUrl: window.location.href,
      assetUrls: this.collectAssetUrls(),
    };

    if (this.ws?.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(LZString.compressToBase64(JSON.stringify(payload)));
        this.eventQueue = [];
        this.consoleLogs = [];
      } catch (error) {
        console.error("Failed to send data:", error);
      }
    }
  }

  private setupEventListeners() {
    ["click", "scroll", "input", "change", "mousemove", "beforeunload"].forEach(
      (eventType) => {
        document.addEventListener(
          eventType,
          (e) => {
            const target = e.target as HTMLElement;
            if (!target) return;

            this.eventQueue.push({
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
            });
          },
          true
        );
      }
    );
  }

  private overrideConsoleMethods() {
    type ConsoleMethod = "log" | "warn" | "error" | "info";

    (["log", "warn", "error", "info"] as ConsoleMethod[]).forEach((method) => {
      const original = console[method];
      console[method] = (...args: any[]) => {
        this.consoleLogs.push(`[${method.toUpperCase()}] ${args.join(" ")}`);
        original(...args);
      };
    });
  }

  private collectAssetUrls(): string[] {
    const assets: string[] = [];
    document
      .querySelectorAll("img, video source, iframe, script")
      .forEach((el) => {
        const src = (
          el as
            | HTMLImageElement
            | HTMLSourceElement
            | HTMLIFrameElement
            | HTMLScriptElement
        ).src;
        if (src) assets.push(src);
      });
    return assets;
  }

  private startPeriodicCollection() {
    setInterval(() => this.sendQueuedData(), 5000);
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
