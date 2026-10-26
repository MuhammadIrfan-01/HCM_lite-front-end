"use client";

import { useEffect, useState } from "react";
import { api, jsonBody } from "@/lib/api";

export default function NotificationsView({ token }: { token: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [error, setError] = useState("");

  async function load() {
    setItems(await api<any[]>("/notifications", { token }));
  }

  useEffect(() => {
    load().catch((requestError) => setError(requestError.message));
  }, [token]);

  async function markRead(id: string) {
    try {
      await api(`/notifications/${id}/read`, {
        token,
        method: "PATCH",
        body: jsonBody({}),
      });
      await load();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not update this notification.",
      );
    }
  }

  return (
    <section className="panel full-panel">
      <div className="panel-heading">
        <div>
          <h3>Notifications</h3>
          <p>Personal updates about leave and payroll.</p>
        </div>
      </div>
      {error && <div className="alert error">{error}</div>}
      <div className="notification-list">
        {items.map((item) => (
          <article
            className={`notification-item ${item.read_at ? "read" : ""}`}
            key={item.id}
          >
            <span className="notification-dot" />
            <div>
              <b>{item.message}</b>
              <small>{new Date(item.created_at).toLocaleString()}</small>
            </div>
            {!item.read_at && (
              <button className="text-link" onClick={() => markRead(item.id)}>
                Mark read
              </button>
            )}
          </article>
        ))}
        {items.length === 0 && (
          <div className="empty-state">
            <span>♧</span>
            <b>No notifications yet</b>
            <small>New updates will show here.</small>
          </div>
        )}
      </div>
    </section>
  );
}
