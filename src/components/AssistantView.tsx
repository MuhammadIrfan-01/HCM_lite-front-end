"use client";

import { FormEvent, useEffect, useRef, useState, useMemo } from "react";
import { api, jsonBody } from "@/lib/api";
import { Role } from "@/lib/types";

interface AssistantViewProps {
  token: string;
  role?: Role;
  userName?: string;
  onNavigate?: (page: string) => void;
}

interface ChatMessage {
  id: string;
  role: "assistant" | "user";
  content: string;
  timestamp: string;
  generated?: boolean;
}

const ROLE_PROMPTS: Record<Role | "default", { icon: string; text: string }[]> = {
  employee: [
    { icon: "🏖", text: "What is my current leave balance for this year?" },
    { icon: "⏱", text: "What is the policy for office timings and grace period?" },
    { icon: "📅", text: "What are the upcoming company holidays?" },
    { icon: "📝", text: "How does the leave approval and quota policy work?" },
  ],
  hr: [
    { icon: "👥", text: "What is our current active headcount by department?" },
    { icon: "📊", text: "Show me an attendance summary for this month." },
    { icon: "⏱", text: "Who are the top late comers this month?" },
    { icon: "🏖", text: "Show leave utilization breakdown across types." },
  ],
  admin: [
    { icon: "💼", text: "Show company payroll gross and net summary." },
    { icon: "👥", text: "What is our overall headcount and attendance rate?" },
    { icon: "⏱", text: "Who has the most late days across departments?" },
    { icon: "📜", text: "What are our organization leave quotas and rules?" },
  ],
  default: [
    { icon: "⏱", text: "What are the company office hours and grace period?" },
    { icon: "📅", text: "What are the upcoming public holidays?" },
    { icon: "🏖", text: "How do leave quotas and requests work?" },
    { icon: "💼", text: "What is the payroll calculation and deduction policy?" },
  ],
};

export default function AssistantView({
  token,
  role = "employee",
  userName = "there",
  onNavigate,
}: AssistantViewProps) {
  const storageKey = `hcm_assistant_history_${role}`;

  const defaultGreeting: ChatMessage = useMemo(() => ({
    id: "welcome-msg",
    role: "assistant",
    content: `Hello ${userName}! I am your **HCM Operations Assistant**. I can help you with attendance insights, leave balances, company policies, holidays, and workplace rules.\n\nAsk me anything below or tap one of the suggested questions to get started.`,
    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  }), [userName]);

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return [defaultGreeting];
  });

  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    } catch {}
  }, [messages, storageKey]);

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ behavior: "smooth" });
  }, [messages, busy]);

  const suggestions = ROLE_PROMPTS[role] || ROLE_PROMPTS.default;

  async function handleSend(questionText?: string) {
    const question = (questionText || message).trim();
    if (!question || busy) return;

    setMessage("");
    setError("");

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: question,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((current) => [...current, userMsg]);
    setBusy(true);

    try {
      const response = await api<{ answer: string; label: string }>("/ai/chat", {
        token,
        method: "POST",
        body: jsonBody({ message: question }),
      });

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: response.answer || "I could not find an answer in the available records.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        generated: true,
      };

      setMessages((current) => [...current, assistantMsg]);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "The assistant could not complete your request. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void handleSend();
  }

  function clearChat() {
    if (messages.length <= 1) return;
    if (window.confirm("Clear all messages in this conversation?")) {
      setMessages([defaultGreeting]);
      try {
        localStorage.removeItem(storageKey);
      } catch {}
    }
  }

  function copyText(id: string, text: string) {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <section className="panel assistant-panel">
      {/* Assistant Header */}
      <div className="assistant-heading">
        <span className="assistant-mark" aria-hidden="true">
          ✳
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h3>HCM Intelligent Assistant</h3>
            <span className="badge approved">AI Active</span>
          </div>
          <p>
            Role-scoped ({role.toUpperCase()}) intelligence using your organization’s live database and company policies.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {messages.length > 1 && (
            <button
              type="button"
              className="button secondary small-button"
              onClick={clearChat}
              title="Clear conversation history"
            >
              Clear chat
            </button>
          )}
        </div>
      </div>

      {/* Suggested Quick Prompts */}
      <div className="assistant-suggestions-bar">
        <span className="suggestions-label">Suggestions:</span>
        <div className="suggestions-scroll">
          {suggestions.map((item, idx) => (
            <button
              key={idx}
              type="button"
              className="suggestion-chip"
              onClick={() => handleSend(item.text)}
              disabled={busy}
            >
              <span>{item.icon}</span>
              <span>{item.text}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Messages Log */}
      <div className="chat-messages" aria-live="polite">
        {messages.map((item) => (
          <div
            key={item.id}
            className={`chat-row ${item.role}`}
          >
            <div className="chat-avatar" aria-hidden="true">
              {item.role === "assistant" ? "✳" : userName[0] || "U"}
            </div>
            <div className="chat-bubble">
              <div className="chat-bubble-content">
                <FormattedMessage text={item.content} />
              </div>
              <div className="chat-bubble-footer">
                <span className="chat-time">{item.timestamp}</span>
                {item.role === "assistant" && (
                  <button
                    type="button"
                    className="copy-bubble-btn"
                    onClick={() => copyText(item.id, item.content)}
                    title="Copy response"
                  >
                    {copiedId === item.id ? "✓ Copied" : "Copy"}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {busy && (
          <div className="chat-row assistant">
            <div className="chat-avatar" aria-hidden="true">
              ✳
            </div>
            <div className="chat-bubble typing">
              <div className="typing-indicator">
                <span />
                <span />
                <span />
              </div>
              <span>Searching permitted company records & policy rules…</span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {error && (
        <div className="alert error" role="alert" style={{ margin: "12px 0 0" }}>
          <span>{error}</span>
          <button
            type="button"
            className="button secondary small-button"
            style={{ marginLeft: "auto" }}
            onClick={() => handleSend()}
          >
            Retry
          </button>
        </div>
      )}

      {/* Message Composer */}
      <form className="chat-composer" onSubmit={onSubmit}>
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={2}
          placeholder={`Ask about people, attendance, leave balance, or policies… (Enter to send, Shift+Enter for new line)`}
          disabled={busy}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void handleSend();
            }
          }}
        />
        <button
          className="button primary"
          type="submit"
          disabled={busy || !message.trim()}
          aria-label="Send message"
        >
          {busy ? (
            "Thinking…"
          ) : (
            <>
              Send <span>→</span>
            </>
          )}
        </button>
      </form>
      <div className="assistant-footer-note">
        <span>🔒 Answers respect your account role ({role}). The assistant cannot modify live records directly.</span>
      </div>
    </section>
  );
}

/**
 * Lightweight formatting for assistant messages:
 * Supports markdown bold (**text**), headers (### text), bullet points (• or -), and line breaks.
 */
function FormattedMessage({ text }: { text: string }) {
  const lines = text.split("\n");

  return (
    <div className="formatted-chat-text">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} style={{ height: 6 }} />;
        }

        // Section header
        if (trimmed.startsWith("### ")) {
          return (
            <h4 key={idx} className="chat-heading-4">
              {trimmed.replace(/^###\s+/, "")}
            </h4>
          );
        }

        // Bullet point
        if (trimmed.startsWith("• ") || trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          const bulletContent = trimmed.replace(/^[-•*]\s+/, "");
          return (
            <div key={idx} className="chat-bullet-row">
              <span className="bullet-sym">•</span>
              <span>{parseInlineStyles(bulletContent)}</span>
            </div>
          );
        }

        return <p key={idx}>{parseInlineStyles(line)}</p>;
      })}
    </div>
  );
}

function parseInlineStyles(content: string) {
  // Parse **bold** parts
  const parts = content.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}
