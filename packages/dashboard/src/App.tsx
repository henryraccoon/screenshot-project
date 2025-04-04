import { useEffect, useState } from "react";
import { Session } from "./types/session";
import { websocketService } from "./api/websocket";
import { SessionCard } from "./components/SessionCard";

function App() {
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    const unsubscribe = websocketService.subscribe((newSessions) => {
      setSessions(newSessions);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-3xl font-bold mb-8">Analytics Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sessions.map((session) => (
          <SessionCard key={session.id} session={session} />
        ))}
      </div>
    </div>
  );
}

export default App;
