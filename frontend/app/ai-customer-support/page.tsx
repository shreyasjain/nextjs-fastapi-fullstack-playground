
"use client";

import { FormEvent, useState } from "react";

type Ticket = {
  id: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  created_at: string;
};

type ChatResponse = {
  conversation_id: string;
  reply: string;
  tickets: Ticket[];
  actions: string[];
};

type Message = {
  role: "user" | "assistant";
  content: string;
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

const examples = [
  "Where is my order ORD-1001?",
  "I have a problem with my delivery.",
  "I want to speak to a human agent.",
];

export default function AICustomerSupportPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hello! I'm your AI support agent. I can check demo orders, create support tickets, and record requests for human assistance. How can I help?",
    },
  ]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function sendMessage(
    event?: FormEvent<HTMLFormElement>,
    preset?: string
  ) {
    event?.preventDefault();

    const message = (preset ?? input).trim();
    if (!message || loading) return;

    setInput("");
    setError("");
    setLoading(true);

    setMessages((previous) => [
      ...previous,
      { role: "user", content: message },
    ]);

    try {
      const response = await fetch(`${API_URL}/customer-support/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          conversation_id: conversationId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.detail || `Request failed (${response.status}).`
        );
      }

      const result = data as ChatResponse;

      setConversationId(result.conversation_id);
      setTickets(result.tickets ?? []);
      setMessages((previous) => [
        ...previous,
        { role: "assistant", content: result.reply },
      ]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to contact the support agent."
      );
    } finally {
      setLoading(false);
    }
  }

  function startNewConversation() {
    setConversationId(null);
    setTickets([]);
    setError("");
    setMessages([
      {
        role: "assistant",
        content:
          "New conversation started. What can I help you with?",
      },
    ]);
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-8 text-zinc-100 sm:px-8">
      <div className="mx-auto max-w-6xl">

        <header className="mb-8 mt-7 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-blue-400">
              AI Projects / Customer Experience
            </p>
            <a
              href="/"
              className="text-3xl font-bold tracking-tight transition hover:text-blue-400 sm:text-4xl"
            >
              AI Customer Support
            </a>
            <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-400">
              An AI agent that looks up orders, creates support tickets,
              and records human escalation requests.
            </p>
          </div>

          <button
            onClick={startNewConversation}
            disabled={loading}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm transition hover:bg-zinc-900 disabled:opacity-50"
          >
            New conversation
          </button>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="flex min-h-[580px] flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
            <div className="flex items-center gap-3 border-b border-zinc-800 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/20 text-lg text-blue-400">
                AI
              </div>
              <div>
                <p className="font-semibold">Support assistant</p>
                <p className="text-xs text-zinc-400">
                  Tool-enabled customer support
                </p>
              </div>
            </div>

            <div
              aria-live="polite"
              className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-6"
            >
              {messages.map((message, index) => (
                <div
                  key={`${index}-${message.role}`}
                  className={`flex ${
                    message.role === "user"
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[90%] whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-sm leading-6 sm:max-w-[80%] ${
                      message.role === "user"
                        ? "rounded-br-sm bg-blue-600 text-white"
                        : "rounded-bl-sm border border-zinc-700 bg-zinc-950 text-zinc-200"
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              ))}

              {loading && (
                <p role="status" className="text-sm text-zinc-400">
                  Agent is thinking and checking available tools...
                </p>
              )}

              {error && (
                <div
                  role="alert"
                  className="rounded-lg border border-red-900 bg-red-950/40 p-3 text-sm text-red-300"
                >
                  {error}
                </div>
              )}
            </div>

            {messages.length <= 1 && (
              <div className="flex flex-wrap gap-2 px-4 pb-3">
                {examples.map((example) => (
                  <button
                    key={example}
                    disabled={loading}
                    onClick={() => sendMessage(undefined, example)}
                    className="rounded-full border border-zinc-700 px-3 py-2 text-left text-xs text-zinc-300 transition hover:border-blue-500 hover:text-white disabled:opacity-50"
                  >
                    {example}
                  </button>
                ))}
              </div>
            )}

            <form
              onSubmit={(event) => sendMessage(event)}
              className="flex items-end gap-3 border-t border-zinc-800 p-4"
            >
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask about an order or describe your issue..."
                maxLength={4000}
                rows={2}
                className="min-w-0 flex-1 resize-y rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-sm outline-none transition focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Send
              </button>
            </form>
          </section>

          <aside className="space-y-5">
            <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
              <h2 className="font-semibold">Agent capabilities</h2>
              <ul className="mt-4 space-y-4 text-sm">
                <li>
                  <p className="font-medium">Order lookup</p>
                  <p className="mt-1 text-zinc-400">
                    Retrieve status and estimated delivery.
                  </p>
                </li>
                <li>
                  <p className="font-medium">Support tickets</p>
                  <p className="mt-1 text-zinc-400">
                    Track issues that need follow-up.
                  </p>
                </li>
                <li>
                  <p className="font-medium">Human escalation</p>
                  <p className="mt-1 text-zinc-400">
                    Create a high-priority ticket when requested.
                  </p>
                </li>
              </ul>
            </section>

            <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-semibold">Support tickets</h2>
                <span className="rounded-full bg-zinc-800 px-2 py-1 text-xs text-zinc-300">
                  {tickets.length}
                </span>
              </div>

              {tickets.length === 0 ? (
                <p className="mt-4 text-sm leading-6 text-zinc-400">
                  Tickets created during this conversation will appear here.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {tickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="rounded-xl border border-zinc-800 bg-zinc-950 p-3"
                    >
                      <p className="break-words text-sm font-medium">
                        {ticket.subject}
                      </p>
                      <p className="mt-2 text-xs text-zinc-400">
                        {ticket.category} · {ticket.priority} priority
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        Status: {ticket.status}
                      </p>
                      <p className="mt-2 break-all text-xs text-zinc-500">
                        ID: {ticket.id}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <p className="text-xs leading-5 text-zinc-500">
              Demo environment: order records are simulated. Human escalation
              creates a ticket but does not contact a live support agent.
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
}
