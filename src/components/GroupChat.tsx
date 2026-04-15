"use client";

import { useEffect, useRef, useState } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

const SHARED_SESSION = "group-chat-general";
const AVATAR_COLORS = [
  "bg-indigo-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-violet-500",
  "bg-blue-500",
  "bg-pink-500",
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

function timeLabel(ts: number) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

interface GroupChatProps {
  operatorId: string;
  operatorName: string;
}

export function GroupChat({ operatorId, operatorName }: GroupChatProps) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const chat = useAction(api.agent.chat);
  const messages = useQuery(api.messages.getBySession, {
    operatorId,
    sessionId: SHARED_SESSION,
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const query = input.trim();
    setInput("");
    setLoading(true);
    try {
      await chat({
        operatorId,
        query,
        sessionId: SHARED_SESSION,
        senderName: operatorName,
      });
    } catch (err: any) {
      console.error("Chat error:", err);
    }
    setLoading(false);
  };

  const sorted = [...(messages ?? [])].sort((a: any, b: any) => a.createdAt - b.createdAt);

  return (
    <div className="flex h-full flex-col">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto max-w-2xl space-y-1">
          {sorted.length === 0 && !loading && (
            <div className="py-20 text-center">
              <p className="text-2xl font-semibold text-gray-900">Welcome to # general</p>
              <p className="mt-2 text-sm text-gray-500">
                This is the shared channel for all operators. The AI assistant is in the room.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {[
                  "What's the biggest risk across all stores right now?",
                  "Any cross-store patterns I should know about?",
                  "Summarize today's open escalations.",
                ].map((s) => (
                  <button
                    key={s}
                    onClick={() => setInput(s)}
                    className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {sorted.map((msg: any, i: number) => {
            const isUser = msg.role === "user";
            const sender = isUser ? (msg.senderName || "Operator") : "FloorAI";
            const showHeader =
              i === 0 ||
              sorted[i - 1].role !== msg.role ||
              (sorted[i - 1] as any).senderName !== (msg as any).senderName;

            return (
              <div key={msg._id} className={`group ${showHeader ? "mt-4" : "mt-0.5"}`}>
                {showHeader && (
                  <div className="mb-1 flex items-center gap-2">
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-lg text-[11px] font-bold text-white ${
                        isUser ? getAvatarColor(sender) : "bg-gray-800"
                      }`}
                    >
                      {isUser ? getInitials(sender) : "AI"}
                    </div>
                    <span className="text-[13px] font-semibold text-gray-900">{sender}</span>
                    <span className="text-[11px] text-gray-400">{timeLabel(msg.createdAt)}</span>
                  </div>
                )}
                <div className="pl-9">
                  {isUser ? (
                    <p className="text-[14px] leading-relaxed text-gray-800">{msg.content}</p>
                  ) : (
                    <div className="text-[14px] leading-relaxed text-gray-700 [&_strong]:font-semibold [&_strong]:text-gray-900 [&_h1]:mt-3 [&_h1]:text-base [&_h1]:font-semibold [&_h2]:mt-3 [&_h2]:text-sm [&_h2]:font-semibold [&_h3]:mt-2 [&_h3]:text-sm [&_h3]:font-semibold [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mt-1 [&_p]:mt-1.5 [&_blockquote]:border-l-2 [&_blockquote]:border-indigo-200 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-gray-500 [&_code]:rounded [&_code]:bg-gray-100 [&_code]:px-1 [&_code]:text-[12px]">
                      <p className="whitespace-pre-wrap">{msg.content || (msg.status === "streaming" ? "..." : "")}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="mt-4">
              <div className="mb-1 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-800 text-[11px] font-bold text-white">
                  AI
                </div>
                <span className="text-[13px] font-semibold text-gray-900">FloorAI</span>
              </div>
              <div className="pl-9">
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:0.15s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:0.3s]" />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 bg-white px-4 py-3">
        <form onSubmit={handleSubmit} className="mx-auto max-w-2xl">
          <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 transition-colors focus-within:border-indigo-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-100">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Message # general as ${operatorName}...`}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-30"
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
