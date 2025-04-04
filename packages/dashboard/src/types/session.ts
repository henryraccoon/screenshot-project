export interface Session {
  id: string;
  startTime: string;
  events: any[];
  screenshotPath: string;
  pageUrl: string;
  consoleLogs: string[];
  aiAnalysis: string;
}

export interface SessionCardProps {
  session: Session;
}
