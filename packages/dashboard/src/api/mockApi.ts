import { Session } from "../types/session";

// Mock data
const mockSessions: Session[] = [
  {
    sessionId: "session-1",
    timestamp: Date.now() - 3600000, // 1 hour ago
    events: [],
    domSnapshot: "<html><body><h1>Mock Session 1</h1></body></html>",
    styles: {
      inline: [],
      computed: [],
    },
    pageUrl: "http://localhost:8000",
    consoleLogs: [],
    assetUrls: [],
  },
  {
    sessionId: "session-2",
    timestamp: Date.now() - 7200000, // 2 hours ago
    events: [],
    domSnapshot: "<html><body><h1>Mock Session 2</h1></body></html>",
    styles: {
      inline: [],
      computed: [],
    },
    pageUrl: "http://localhost:8000",
    consoleLogs: [],
    assetUrls: [],
  },
  {
    sessionId: "session-3",
    timestamp: Date.now() - 10800000, // 3 hours ago
    events: [],
    domSnapshot: "<html><body><h1>Mock Session 3</h1></body></html>",
    styles: {
      inline: [],
      computed: [],
    },
    pageUrl: "http://localhost:8000",
    consoleLogs: [],
    assetUrls: [],
  },
];

export const fetchSessions = async (): Promise<Session[]> => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500));
  return mockSessions;
};
