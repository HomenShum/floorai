"use client";

import { Suspense } from "react";
import { ChatPanel } from "@/components/ChatPanel";
import { useOperatorSession } from "@/components/OperatorSessionProvider";

const SHARED_SESSION_ID = "group-chat-general";

function ChatPageInner() {
  const { operator } = useOperatorSession();

  if (!operator) {
    return (
      <div className="flex h-[calc(100vh-24px)] items-center justify-center">
        <div className="text-center">
          <p className="text-sm font-medium text-gray-900">Group Chat</p>
          <p className="mt-1 text-sm text-gray-500">
            Select an operator session from{" "}
            <a href="/" className="text-indigo-600 hover:underline">home</a>
            {" "}to join the group chat.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-24px)] flex-col">
      <ChatPanel
        operatorId={operator.operatorId}
        operatorName={operator.name}
        sharedSessionId={SHARED_SESSION_ID}
      />
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-gray-400">Loading chat...</div>}>
      <ChatPageInner />
    </Suspense>
  );
}
