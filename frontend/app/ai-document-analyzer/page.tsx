
"use client";

import { useEffect, useRef, useState } from "react";

const API_URL = "http://127.0.0.1:8000/ai-document-analyzer";

type DocumentItem = {
  id: string;
  file_name: string;
  uploaded_at?: string;
};

type Source = {
  chunk_index: number;
  similarity_score: number;
  text: string;
};

type Message = {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
};

export default function Home() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [uploading, setUploading] = useState(false);
  const [asking, setAsking] = useState(false);
  const [loadingDocuments, setLoadingDocuments] = useState(true);
  const [error, setError] = useState("");
  const [expandedSource, setExpandedSource] = useState<number | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const chatEnd = useRef<HTMLDivElement>(null);

  async function loadDocuments() {
    setLoadingDocuments(true);
    try {
      const response = await fetch(`${API_URL}/documents`);
      if (!response.ok) throw new Error("Could not load documents.");
      const data: DocumentItem[] = await response.json();
      setDocuments(data);
      setSelectedId((current) =>
        data.some((doc) => doc.id === current)
          ? current
          : data[0]?.id ?? ""
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load documents.");
    } finally {
      setLoadingDocuments(false);
    }
  }

  useEffect(() => {
    void loadDocuments();
  }, []);

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, asking]);

  async function uploadDocument(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("Please select a PDF file.");
      event.target.value = "";
      return;
    }

    setError("");
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${API_URL}/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail ?? "Upload failed.");
      }

      await loadDocuments();
      setSelectedId(data.id);
      setMessages([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  async function deleteDocument(id: string) {
    if (!window.confirm("Delete this document permanently?")) return;

    setError("");
    try {
      const response = await fetch(`${API_URL}/documents/${id}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail ?? "Could not delete document.");
      }

      setDocuments((current) => current.filter((doc) => doc.id !== id));

      if (selectedId === id) {
        setSelectedId("");
        setMessages([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete document.");
    }
  }

  async function askQuestion(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = question.trim();

    if (!trimmed || !selectedId || asking) return;

    setError("");
    setQuestion("");
    setMessages((current) => [
      ...current,
      { role: "user", content: trimmed },
    ]);
    setAsking(true);

    try {
      const response = await fetch(`${API_URL}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document_id: selectedId,
          question: trimmed,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail ?? "Could not get an answer.");
      }

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: data.answer ?? data.message ?? "No answer returned.",
          sources: data.sources ?? [],
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not get an answer.");
    } finally {
      setAsking(false);
    }
  }

  const selectedDocument = documents.find((doc) => doc.id === selectedId);

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="/">
          <span className="brand-mark">D</span>
          <span>
            <strong>DocuMind</strong>
            <small>AI DOCUMENT ASSISTANT</small>
          </span>
        </a>

        <button
          className="upload-button"
          onClick={() => fileInput.current?.click()}
          disabled={uploading}
        >
          <span>{uploading ? "◌" : "+"}</span>
          {uploading ? "Uploading PDF..." : "Upload document"}
        </button>

        <input
          ref={fileInput}
          type="file"
          accept=".pdf,application/pdf"
          hidden
          onChange={uploadDocument}
        />

        <div className="sidebar-heading">
          <span>Your documents</span>
          <span className="count">{documents.length}</span>
        </div>

        <div className="document-list">
          {loadingDocuments ? (
            <p className="muted small">Loading documents...</p>
          ) : documents.length === 0 ? (
            <p className="muted small">No documents yet. Upload a PDF to begin.</p>
          ) : (
            documents.map((doc) => (
              <div
                key={doc.id}
                className={`document-item ${selectedId === doc.id ? "selected" : ""}`}
              >
                <button
                  className="document-select"
                  onClick={() => {
                    setSelectedId(doc.id);
                    setMessages([]);
                    setError("");
                  }}
                  title={doc.file_name}
                >
                  <span className="pdf-icon">PDF</span>
                  <span className="document-name">{doc.file_name}</span>
                </button>
                <button
                  className="delete-button"
                  onClick={() => deleteDocument(doc.id)}
                  aria-label={`Delete ${doc.file_name}`}
                  title="Delete document"
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>

        <div className="sidebar-footer">
          <span className="status-dot" />
          Powered by FastAPI + RAG
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <div className="eyebrow">YOUR PERSONAL RESEARCH ASSISTANT</div>
            <h1>Chat with your documents</h1>
          </div>
          <div className="connection-status">
            <span className="status-dot" />
            AI workspace
          </div>
        </header>

        {error && (
          <div className="error-banner" role="alert">
            <span>{error}</span>
            <button onClick={() => setError("")} aria-label="Dismiss error">
              ×
            </button>
          </div>
        )}

        {!selectedDocument ? (
          <div className="empty-state">
            <div className="hero-icon">✳</div>
            <p className="eyebrow">DOCUMENT INTELLIGENCE</p>
            <h2>Your documents, understood.</h2>
            <p className="empty-description">
              Upload a PDF and ask questions. Get focused answers grounded in
              the content of your document.
            </p>
            <button
              className="upload-button hero-button"
              onClick={() => fileInput.current?.click()}
              disabled={uploading}
            >
              {uploading ? "Uploading..." : "↑ Upload your first PDF"}
            </button>
            <div className="feature-row">
              <span>01 · Upload a PDF</span>
              <span>02 · Ask a question</span>
              <span>03 · Explore sources</span>
            </div>
          </div>
        ) : (
          <>
            <div className="document-bar">
              <span className="pdf-icon">PDF</span>
              <div className="active-document">
                <strong>{selectedDocument.file_name}</strong>
                <small>Selected document</small>
              </div>
              <span className="ready-pill">
                <span className="status-dot" />
                Ready to chat
              </span>
            </div>

            <div className="chat-area">
              {messages.length === 0 ? (
                <div className="chat-welcome">
                  <div className="welcome-icon">✳</div>
                  <h2>What would you like to know?</h2>
                  <p>
                    Ask a question about <strong>{selectedDocument.file_name}</strong>.
                    Answers are based on retrieved document passages.
                  </p>
                  <div className="suggestion-list">
                    {[
                      "Summarize the key points",
                      "What are the main conclusions?",
                      "What important facts should I know?",
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        className="suggestion"
                        onClick={() => setQuestion(suggestion)}
                      >
                        <span>↗</span> {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="messages">
                  {messages.map((message, index) => (
                    <article
                      key={`${index}-${message.role}`}
                      className={`message ${message.role}`}
                    >
                      <div className="avatar">
                        {message.role === "user" ? "Y" : "✳"}
                      </div>
                      <div className="message-body">
                        <div className="message-label">
                          {message.role === "user" ? "You" : "DocuMind"}
                        </div>
                        <div className="message-content">{message.content}</div>

                        {message.sources && message.sources.length > 0 && (
                          <div className="sources">
                            <div className="sources-heading">
                              Sources · {message.sources.length} chunks
                            </div>
                            {message.sources.map((source) => (
                              <div
                                className="source-card"
                                key={source.chunk_index}
                              >
                                <button
                                  className="source-toggle"
                                  onClick={() =>
                                    setExpandedSource((current) =>
                                      current === source.chunk_index
                                        ? null
                                        : source.chunk_index
                                    )
                                  }
                                >
                                  <span>
                                    Chunk {source.chunk_index + 1}
                                  </span>
                                  <span className="source-score">
                                    {(source.similarity_score * 100).toFixed(1)}%
                                    <span>
                                      {expandedSource === source.chunk_index
                                        ? " −"
                                        : " +"}
                                    </span>
                                  </span>
                                </button>
                                {expandedSource === source.chunk_index && (
                                  <p className="source-text">{source.text}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </article>
                  ))}

                  {asking && (
                    <div className="message assistant">
                      <div className="avatar">✳</div>
                      <div className="message-body">
                        <div className="message-label">DocuMind</div>
                        <div className="typing">
                          <span />
                          <span />
                          <span />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={chatEnd} />
                </div>
              )}
            </div>

            <form className="composer" onSubmit={askQuestion}>
              <textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="Ask anything about this document..."
                rows={2}
                disabled={asking}
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    !event.shiftKey &&
                    !event.nativeEvent.isComposing
                  ) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
              />
              <div className="composer-footer">
                <span>Answers are generated from retrieved passages.</span>
                <button
                  type="submit"
                  className="send-button"
                  disabled={!question.trim() || asking}
                  aria-label="Send question"
                >
                  {asking ? "…" : "↑"}
                </button>
              </div>
            </form>
          </>
        )}
      </section>
    </main>
  );
}
