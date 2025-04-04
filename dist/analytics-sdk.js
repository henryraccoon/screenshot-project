var AnalyticsClient = /** @class */ (function () {
    function AnalyticsClient(sessionId) {
        this.ws = null;
        this.eventQueue = [];
        this.consoleLogs = [];
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.isConnected = false;
        this.sessionId = sessionId;
        this.initializeWebSocket();
        this.setupEventListeners();
        this.overrideConsoleMethods();
        this.startPeriodicCollection();
    }
    AnalyticsClient.prototype.initializeWebSocket = function () {
        var _this = this;
        this.ws = new WebSocket("wss://example.com/ws");
        this.ws.onopen = function () {
            _this.isConnected = true;
            _this.reconnectAttempts = 0;
            _this.flushQueue();
        };
        this.ws.onclose = function () {
            _this.isConnected = false;
            _this.attemptReconnect();
        };
        this.ws.onerror = function (error) {
            console.error("WebSocket error:", error);
        };
    };
    AnalyticsClient.prototype.attemptReconnect = function () {
        var _this = this;
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            setTimeout(function () {
                _this.initializeWebSocket();
            }, this.reconnectDelay * this.reconnectAttempts);
        }
    };
    AnalyticsClient.prototype.setupEventListeners = function () {
        var _this = this;
        var events = [
            "click",
            "scroll",
            "input",
            "change",
            "mousemove",
            "beforeunload",
        ];
        events.forEach(function (eventType) {
            document.addEventListener(eventType, function (e) {
                var target = e.target;
                if (!target)
                    return;
                var eventData = {
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
                _this.eventQueue.push(eventData);
            }, { capture: true });
        });
    };
    AnalyticsClient.prototype.overrideConsoleMethods = function () {
        var _this = this;
        var methods = ["log", "warn", "error", "info"];
        methods.forEach(function (method) {
            var originalMethod = console[method];
            console[method] = function () {
                var args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    args[_i] = arguments[_i];
                }
                _this.consoleLogs.push("[".concat(method.toUpperCase(), "] ").concat(args.join(" ")));
                originalMethod.apply(console, args);
            };
        });
    };
    AnalyticsClient.prototype.collectAssetUrls = function () {
        var assets = [];
        // Collect image URLs
        document.querySelectorAll("img").forEach(function (img) {
            var src = img.src;
            if (src)
                assets.push(src);
        });
        // Collect video URLs
        document.querySelectorAll("video source").forEach(function (video) {
            var src = video.src;
            if (src)
                assets.push(src);
        });
        // Collect iframe URLs
        document.querySelectorAll("iframe").forEach(function (iframe) {
            var src = iframe.src;
            if (src)
                assets.push(src);
        });
        // Collect script URLs
        document.querySelectorAll("script").forEach(function (script) {
            var src = script.src;
            if (src)
                assets.push(src);
        });
        return assets;
    };
    AnalyticsClient.prototype.createPayload = function () {
        return {
            sessionId: this.sessionId,
            timestamp: Date.now(),
            events: this.eventQueue,
            domSnapshot: document.documentElement.outerHTML,
            consoleLogs: this.consoleLogs,
            pageUrl: window.location.href,
            assetUrls: this.collectAssetUrls(),
        };
    };
    AnalyticsClient.prototype.startPeriodicCollection = function () {
        var _this = this;
        setInterval(function () {
            var payload = _this.createPayload();
            var compressedPayload = LZString.compressToBase64(JSON.stringify(payload));
            if (_this.isConnected && _this.ws) {
                _this.ws.send(compressedPayload);
                _this.eventQueue = [];
                _this.consoleLogs = [];
            }
        }, 5000);
    };
    AnalyticsClient.prototype.flushQueue = function () {
        if (this.eventQueue.length > 0) {
            var payload = this.createPayload();
            var compressedPayload = LZString.compressToBase64(JSON.stringify(payload));
            if (this.ws && this.isConnected) {
                this.ws.send(compressedPayload);
                this.eventQueue = [];
                this.consoleLogs = [];
            }
        }
    };
    return AnalyticsClient;
}());
// Initialize the client
var initAnalyticsClient = function (sessionId) {
    new AnalyticsClient(sessionId);
};
// Export the initialization function
export { initAnalyticsClient };
