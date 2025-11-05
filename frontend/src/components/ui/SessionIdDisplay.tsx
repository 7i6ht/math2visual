interface SessionIdDisplayProps {
  sessionId: string | null;
}

export function SessionIdDisplay({ sessionId }: SessionIdDisplayProps) {
  if (!sessionId) return null;

  return (
    <div className="fixed bottom-0 right-0 z-50 bg-gray-100/80 dark:bg-gray-800/80 text-gray-600 dark:text-gray-400 px-2 py-1 responsive-smaller-text-font-size font-mono">
      Session ID: {sessionId}
    </div>
  );
}

