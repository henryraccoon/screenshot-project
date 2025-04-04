export interface Session {
  id: string;
  timestamp: number;
  summary: {
    userActivity: string;
    potentialIssues: string[];
    uxSuggestions: string[];
    confidence: number;
  };
  screenshotPath?: string;
}

export interface SessionCardProps {
  session: Session;
}
