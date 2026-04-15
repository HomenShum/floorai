"use client";

import Link from "next/link";
import { Suspense } from "react";
import { GroupChat, SHARED_GROUP_SESSION } from "@/components/GroupChat";
import { ChatPanel } from "@/components/ChatPanel";
import { useOperatorSession } from "@/components/OperatorSessionProvider";

function ChatPreviewShell() {
  return (
    <div className="min-h-[calc(100vh-16px)] bg-[radial-gradient(circle_at_top,#eff6ff_0%,#ffffff_32%,#ffffff_100%)]">
      <div className="mx-auto flex min-h-[calc(100vh-16px)] max-w-[1600px] flex-col px-4 py-4 sm:px-6 lg:px-8 xl:pr-[580px]">
        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col">
          <header className="mb-4 rounded-[24px] border border-[rgba(72,57,39,0.12)] bg-white/95 px-6 py-5 shadow-[0_18px_40px_rgba(33,27,20,0.05)] backdrop-blur">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
              Shared Channel
            </p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">
                  Group chat with a live operator rail
                </h1>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
                  The shared channel stays in the center. The operator rail stays on the right for
                  plan trace, sources, telemetry, and quality checks.
                </p>
              </div>
              <div className="rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                Operator session required
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-hidden rounded-[28px] border border-[rgba(72,57,39,0.12)] bg-white shadow-[0_20px_40px_rgba(33,27,20,0.06)]">
            <div className="flex h-full flex-col">
              <div className="flex-1 overflow-y-auto px-4 py-4">
                <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center py-20 text-center">
                  <p className="text-2xl font-semibold text-slate-900">Welcome to # general</p>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                    Pick a store or regional operator identity first so the shared channel and the
                    AI rail can enforce the right workspace scope.
                  </p>
                  <div className="mt-6 flex flex-wrap justify-center gap-2">
                    {[
                      "Which stores need intervention first?",
                      "Any cross-store patterns I should know about?",
                      "Summarize today's open escalations.",
                    ].map((prompt) => (
                      <span
                        key={prompt}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500"
                      >
                        {prompt}
                      </span>
                    ))}
                  </div>
                  <Link href="/" className="btn-primary mt-8 inline-flex">
                    Choose operator session
                  </Link>
                </div>
              </div>

              <div className="border-t border-slate-200 bg-white px-4 py-3">
                <div className="mx-auto flex max-w-2xl items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 opacity-70">
                  <input
                    type="text"
                    value=""
                    readOnly
                    placeholder="Message # general once an operator session is active..."
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    disabled
                    className="rounded-lg bg-slate-300 px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <aside className="fixed inset-y-3 right-3 z-50 flex w-[min(560px,calc(100vw-1.5rem))] flex-col rounded-[28px] border border-[rgba(72,57,39,0.12)] bg-[rgba(255,250,243,0.98)] shadow-2xl backdrop-blur">
        <div className="border-b border-[rgba(72,57,39,0.08)] px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">AI Assistant</h2>
              <p className="mt-0.5 text-xs text-slate-500">Shared channel session preview</p>
            </div>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-500">
              Preview
            </span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[18px] border border-[rgba(72,57,39,0.08)] bg-white px-4 py-3">
              <p className="section-label">Mode</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">Shared channel</p>
              <p className="mt-1 text-xs text-slate-500">Waiting for operator identity</p>
            </div>
            <div className="rounded-[18px] border border-[rgba(72,57,39,0.08)] bg-white px-4 py-3">
              <p className="section-label">Quality</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">Idle</p>
              <p className="mt-1 text-xs text-slate-500">No run has started</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <div className="rounded-[20px] border border-dashed border-[rgba(72,57,39,0.14)] bg-[rgba(255,252,246,0.75)] p-5">
            <p className="text-sm font-semibold text-slate-900">What the rail will show</p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
              <li>Streaming answer text and execution milestones</li>
              <li>Planned and executed tool steps</li>
              <li>Clickable grounded sources</li>
              <li>Runtime quality checks and answer packet IDs</li>
            </ul>
          </div>

          <div className="mt-5 rounded-[20px] border border-[rgba(72,57,39,0.12)] bg-white px-4 py-4">
            <p className="section-label">Suggested shared prompts</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                "Which stores need intervention first?",
                "Summarize today's open escalations.",
                "What cross-store patterns are emerging?",
              ].map((prompt) => (
                <span
                  key={prompt}
                  className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-600"
                >
                  {prompt}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-[rgba(72,57,39,0.08)] bg-[rgba(255,252,246,0.92)] px-5 py-4">
          <Link href="/" className="btn-primary flex w-full items-center justify-center">
            Choose operator session to activate rail
          </Link>
        </div>
      </aside>
    </div>
  );
}

function ChatPageInner() {
  const { operator } = useOperatorSession();

  if (!operator) {
    return <ChatPreviewShell />;
  }

  return (
    <div className="min-h-[calc(100vh-16px)] bg-[radial-gradient(circle_at_top,#eff6ff_0%,#ffffff_32%,#ffffff_100%)]">
      <div className="mx-auto flex min-h-[calc(100vh-16px)] max-w-[1600px] flex-col px-4 py-4 sm:px-6 lg:px-8 xl:pr-[580px]">
        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col">
          <header className="mb-4 rounded-[24px] border border-[rgba(72,57,39,0.12)] bg-white/95 px-6 py-5 shadow-[0_18px_40px_rgba(33,27,20,0.05)] backdrop-blur">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
              Shared Channel
            </p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">
                  Group chat with a live operator rail
                </h1>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
                  The centered channel is where operators talk together. The right rail follows the
                  same shared session and exposes the assistant trace, telemetry, sources, and quality checks.
                </p>
              </div>
              <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                Signed in as <span className="font-semibold text-slate-800">{operator.name}</span>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-hidden rounded-[28px] border border-[rgba(72,57,39,0.12)] bg-white shadow-[0_20px_40px_rgba(33,27,20,0.06)]">
            <GroupChat operatorId={operator.operatorId} operatorName={operator.name} />
          </div>
        </div>
      </div>

      <ChatPanel
        operatorId={operator.operatorId}
        operatorName={operator.name}
        sharedSessionId={SHARED_GROUP_SESSION}
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
