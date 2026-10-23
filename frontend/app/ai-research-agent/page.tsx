
"use client";

import { FormEvent, useState } from "react";

type Source = {
  id: number;
  title: string;
  url: string;
  content: string;
};

type ResearchResponse = {
  question: string;
  report: string;
  sources: Source[];
  searches_performed: number;
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function AIResearchAgentPage() {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<ResearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (question.trim().length < 5) {
      setError("Please enter a research question with at least 5 characters.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(`${API_URL}/research/run`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: question.trim(),
          max_follow_up_searches: 2,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(
          data?.detail || `Research failed (${response.status}).`
        );
      }

      const data: ResearchResponse = await response.json();
      setResult(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to complete the research request."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-10 text-zinc-100 sm:px-8">
      <div className="mx-auto max-w-4xl">

        <header className="mb-10 mt-8">
          <p className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-blue-400">
            AI Projects / Research
          </p>

          <a href="/" className="text-4xl font-bold tracking-tight sm:text-5xl cursor-pointer">
            AI Research Agent
          </a>

          <p className="mt-4 max-w-2xl leading-7 text-zinc-400">
            Research a topic across web sources. Get a structured report
            with evidence and clickable references.
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-7"
        >
          <label
            htmlFor="research-question"
            className="mb-3 block text-sm font-medium"
          >
            What would you like to research?
          </label>

          <textarea
            id="research-question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Compare FastAPI and Django REST Framework for AI applications..."
            rows={4}
            maxLength={1000}
            required
            className="w-full resize-y rounded-xl border border-zinc-700 bg-zinc-950 p-4 text-sm leading-6 outline-none transition focus:border-blue-500"
          />

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-zinc-500">
              Uses web search and an LLM to compile research.
            </p>

            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Researching..." : "Start Research"}
            </button>
          </div>
        </form>

        {loading && (
          <div
            role="status"
            className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900 p-5"
          >
            <p className="font-medium">Research in progress</p>
            <p className="mt-2 text-sm text-zinc-400">
              Searching sources, evaluating evidence, and preparing your report.
              This may take a little time.
            </p>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-red-900 bg-red-950/40 p-4 text-sm text-red-300"
          >
            {error}
          </div>
        )}

        {result && (
          <section className="mt-10 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-2xl font-bold">Research Report</h2>
              <span className="text-sm text-zinc-500">
                {result.sources.length} sources ·{" "}
                {result.searches_performed} searches
              </span>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-7">
              <p className="mb-5 text-sm text-zinc-400">
                {result.question}
              </p>

              <article className="whitespace-pre-wrap break-words text-sm leading-7 text-zinc-200">
                {result.report}
              </article>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-7">
              <h2 className="mb-5 text-xl font-semibold">
                Sources & References
              </h2>

              <div className="space-y-4">
                {result.sources.map((source) => (
                  <div
                    key={source.id}
                    className="border-b border-zinc-800 pb-4 last:border-0 last:pb-0"
                  >
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-blue-400 hover:text-blue-300 hover:underline"
                    >
                      [{source.id}] {source.title}
                    </a>

                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-zinc-400">
                      {source.content}
                    </p>

                    <p className="mt-2 break-all text-xs text-zinc-500">
                      {source.url}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
