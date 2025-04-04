import { Session } from "../types/session";

// Mock data
const mockSessions: Session[] = [
  {
    id: "session-1",
    timestamp: Date.now() - 3600000, // 1 hour ago
    summary: {
      userActivity: "User was browsing the product catalog",
      potentialIssues: [
        "Rapid clicking on product images",
        "Excessive scrolling",
      ],
      uxSuggestions: [
        "Add loading states for images",
        "Implement infinite scroll",
      ],
      confidence: 0.85,
    },
    screenshotPath: "/mock-screenshot-1.png",
  },
  {
    id: "session-2",
    timestamp: Date.now() - 7200000, // 2 hours ago
    summary: {
      userActivity: "User was filling out a registration form",
      potentialIssues: ["Multiple form corrections", "Slow input response"],
      uxSuggestions: ["Add real-time validation", "Optimize form performance"],
      confidence: 0.78,
    },
  },
  {
    id: "session-3",
    timestamp: Date.now() - 10800000, // 3 hours ago
    summary: {
      userActivity: "User was navigating through the checkout process",
      potentialIssues: ["Cart abandonment", "Multiple page refreshes"],
      uxSuggestions: ["Simplify checkout steps", "Add progress indicator"],
      confidence: 0.92,
    },
    screenshotPath: "/mock-screenshot-2.png",
  },
];

export const fetchSessions = async (): Promise<Session[]> => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500));
  return mockSessions;
};
