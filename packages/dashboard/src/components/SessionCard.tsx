import { SessionCardProps } from "../types/session";
import { formatDistanceToNow } from "date-fns";

export const SessionCard = ({ session }: SessionCardProps) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">
            Session {session.id}
          </h3>
          <p className="text-sm text-gray-500">
            {formatDistanceToNow(session.timestamp)} ago
          </p>
        </div>
        <div className="text-sm font-medium px-2 py-1 rounded-full bg-blue-100 text-blue-800">
          {Math.round(session.summary.confidence * 100)}% confidence
        </div>
      </div>

      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-700 mb-1">
          User Activity
        </h4>
        <p className="text-gray-600">{session.summary.userActivity}</p>
      </div>

      {session.summary.potentialIssues.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-red-700 mb-1">
            Potential Issues
          </h4>
          <ul className="list-disc list-inside text-red-600">
            {session.summary.potentialIssues.map((issue, index) => (
              <li key={index} className="text-sm">
                {issue}
              </li>
            ))}
          </ul>
        </div>
      )}

      {session.summary.uxSuggestions.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-green-700 mb-1">
            UX Suggestions
          </h4>
          <ul className="list-disc list-inside text-green-600">
            {session.summary.uxSuggestions.map((suggestion, index) => (
              <li key={index} className="text-sm">
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}

      {session.screenshotPath && (
        <div className="mt-4">
          <img
            src={session.screenshotPath}
            alt={`Screenshot for session ${session.id}`}
            className="w-full h-48 object-cover rounded-md"
          />
        </div>
      )}
    </div>
  );
};
