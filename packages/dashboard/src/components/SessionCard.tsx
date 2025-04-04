import { Session } from "../types/session";

interface SessionCardProps {
  session: Session;
}

export function SessionCard({ session }: SessionCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-2">Session {session.id}</h2>
      <p className="text-gray-600 mb-4">
        Started: {new Date(session.startTime).toLocaleString()}
      </p>
      <div className="space-y-2">
        <p className="text-sm">
          <span className="font-medium">Page:</span> {session.pageUrl}
        </p>
        <p className="text-sm">
          <span className="font-medium">Events:</span> {session.events.length}
        </p>
        <p className="text-sm">
          <span className="font-medium">Console Logs:</span>{" "}
          {session.consoleLogs.length}
        </p>
        {session.screenshotPath && (
          <div className="mt-4">
            <img
              src={session.screenshotPath}
              alt="Session Screenshot"
              className="rounded-lg"
            />
          </div>
        )}
      </div>
    </div>
  );
}
