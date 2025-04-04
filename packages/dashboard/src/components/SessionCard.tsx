import { Session } from "../types/session";
import { useEffect, useRef } from "react";

interface SessionCardProps {
  session: Session;
}

export function SessionCard({ session }: SessionCardProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const doc = iframe.contentDocument;
    if (!doc) return;

    // Remove all script tags from the snapshot
    const cleanSnapshot = session.domSnapshot.replace(
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      ""
    );

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <base href="${session.pageUrl}">
          <style>
            html {
              transform-origin: top left;
            }
          </style>
        </head>
        <body>
          ${cleanSnapshot}
        </body>
      </html>
    `);
    doc.close();

    // Simple scaling function
    const scaleContent = () => {
      const wrapper = iframe.parentElement;
      if (!wrapper || !doc.documentElement) return;

      const scale = Math.min(
        wrapper.clientWidth / doc.documentElement.scrollWidth,
        wrapper.clientHeight / doc.documentElement.scrollHeight,
        1
      );

      doc.documentElement.style.transform = `scale(${scale})`;
      iframe.style.height = `${doc.documentElement.scrollHeight * scale}px`;
    };

    // Scale after content loads
    if (doc.readyState === "complete") {
      scaleContent();
    } else {
      doc.addEventListener("DOMContentLoaded", scaleContent);
    }

    window.addEventListener("resize", scaleContent);
    return () => window.removeEventListener("resize", scaleContent);
  }, [session.domSnapshot, session.pageUrl]);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-2">
        Session {session.sessionId}
      </h2>
      <p className="text-gray-600 mb-4">
        Started: {new Date(session.timestamp).toLocaleString()}
      </p>

      <div className="space-y-4">
        <div className="border rounded-lg p-4 bg-gray-50">
          <h3 className="font-medium mb-2">Page Recreation</h3>
          <div
            className="relative w-full"
            style={{ height: "400px", overflow: "hidden" }}
          >
            <iframe
              ref={iframeRef}
              className="w-full h-full border-0"
              sandbox="allow-same-origin allow-scripts"
              title="Page Recreation"
            />
          </div>
        </div>

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
        </div>
      </div>
    </div>
  );
}
