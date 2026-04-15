"use client";

import { Suspense } from "react";
import { GroupChat } from "@/components/GroupChat";
import { useOperatorSession } from "@/components/OperatorSessionProvider";

function ChatPageInner() {
  const { operator } = useOperatorSession();

  if (!operator) {
    return (
      <div className="flex h-[calc(100vh-16px)] items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-900"># general</p>
          <p className="mt-2 text-sm text-gray-500">
            Select an operator session from{" "}
            <a href="/" className="text-indigo-600 hover:underline">home</a>
            {" "}to join the group chat.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-16px)] flex-col bg-white">
      <GroupChat operatorId={operator.operatorId} operatorName={operator.name} />
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
