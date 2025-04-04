export interface Session {
  sessionId: string;
  timestamp: number;
  events: any[];
  domSnapshot: string;
  styles: {
    inline: string[];
    computed: Array<{
      selector: string;
      styles: { [key: string]: string };
    }>;
  };
  consoleLogs: string[];
  pageUrl: string;
  assetUrls: string[];
}

export interface SessionCardProps {
  session: Session;
}
