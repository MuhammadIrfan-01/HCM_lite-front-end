"use client";

import { FormEvent, useEffect, useState } from "react";
import { api, jsonBody } from "@/lib/api";
import { Role } from "@/lib/types";

export default function AnnouncementsView({
  token,
  role,
}: {
  token: string;
  role: Role;
}) {
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setItems(await api<any[]>("/announcements", { token }));
  }

  useEffect(() => {
    load().catch((requestError) => setError(requestError.message));
  }, [token]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await api("/announcements", {
        token,
        method: "POST",
        body: jsonBody({ title: form.get("title"), body: form.get("body") }),
      });
      setOpen(false);
      await load();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not post the announcement.",
      );
    }
  }

  return (
    <>
      {error && <div className="alert error">{error}</div>}
      <div className="announcement-head">
        {role !== "employee" && (
          <button className="button primary" onClick={() => setOpen(true)}>
            ＋ New announcement
          </button>
        )}
      </div>
      <div className="announcement-grid">
        {items.map((item) => (
          <article className="panel announcement" key={item.id}>
            <div className="announcement-symbol">✳</div>
            <small>{formatDate(item.created_at)}</small>
            <h3>{item.title}</h3>
            <p>{item.body}</p>
            <div className="announcement-author">Posted by {item.author}</div>
          </article>
        ))}
        {items.length === 0 && (
          <div className="panel">
            <EmptyState />
          </div>
        )}
      </div>
      {open && (
        <div className="modal-backdrop">
          <form className="modal" onSubmit={create}>
            <div className="modal-head">
              <div>
                <div className="eyebrow">TEAM COMMUNICATION</div>
                <h2>New announcement</h2>
              </div>
              <button
                type="button"
                className="close-btn"
                onClick={() => setOpen(false)}
              >
                ×
              </button>
            </div>
            <label>
              Title
              <input name="title" required maxLength={120} />
            </label>
            <label>
              Message
              <textarea name="body" rows={5} required maxLength={4000} />
            </label>
            <div className="modal-actions">
              <button
                className="button secondary"
                type="button"
                onClick={() => setOpen(false)}
              >
                Cancel
              </button>
              <button className="button primary">Post announcement</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-PK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function EmptyState() {
  return (
    <div className="empty-state">
      <span>✳</span>
      <b>No announcements yet</b>
      <small>Team updates will appear here.</small>
    </div>
  );
}
