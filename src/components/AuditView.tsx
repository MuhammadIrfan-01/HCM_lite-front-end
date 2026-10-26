"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function AuditView({ token }: { token: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api<any[]>("/audit", { token })
      .then(setItems)
      .catch((requestError) => setError(requestError.message));
  }, [token]);

  return (
    <section className="panel full-panel">
      <div className="panel-heading">
        <div>
          <h3>Audit log</h3>
          <p>Append-only record of important organization actions.</p>
        </div>
      </div>
      {error && <div className="alert error">{error}</div>}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ACTOR</th>
              <th>ACTION</th>
              <th>RECORD</th>
              <th>WHEN</th>
              <th>CHANGES</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.actor_name}</td>
                <td>{item.action}</td>
                <td>
                  {item.entity} {item.entityId}
                </td>
                <td>{new Date(item.created_at).toLocaleString()}</td>
                <td>
                  <details>
                    <summary>View</summary>
                    <pre>
                      {JSON.stringify(
                        { before: item.before_json, after: item.after_json },
                        null,
                        2,
                      )}
                    </pre>
                  </details>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && (
          <div className="empty-state">
            <span>◉</span>
            <b>No audit activity yet</b>
          </div>
        )}
      </div>
    </section>
  );
}
