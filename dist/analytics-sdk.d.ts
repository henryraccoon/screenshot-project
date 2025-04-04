declare global {
    interface Window {
        initAnalyticsClient: (sessionId: string) => void;
    }
}
declare const initAnalyticsClient: (sessionId: string) => void;
export { initAnalyticsClient };
