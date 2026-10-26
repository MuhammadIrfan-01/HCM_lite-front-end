"use client";

import { FormEvent, useEffect, useState } from "react";
import { api, jsonBody } from "@/lib/api";

interface Account {
  id: string;
  name: string;
  email: string;
  active: boolean;
  createdAt: string;
}

export default function HRAccountsView({ token }: { token: string }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [open, setOpen] = useState(false);
  const [temporaryCredentials, setTemporaryCredentials] = useState<{
    name: string;
    email: string;
    password: string;
  } | null>(null);
  const [error, setError] = useState("");

  async function load() {
    setAccounts(await api<Account[]>("/users/hr", { token }));
  }

  useEffect(() => {
    load().catch((requestError) => setError(requestError.message));
  }, [token]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError("");
    try {
      const result = await api<{
        user: { name: string; email: string };
      }>("/users/hr", {
        token,
        method: "POST",
        body: jsonBody({
          name: form.get("name"),
          email: form.get("email"),
          password: form.get("password"),
        }),
      });
      setOpen(false);
      setTemporaryCredentials({
        name: result.user.name,
        email: result.user.email,
        password: String(form.get("password") || ""),
      });
      await load();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not create the HR account.",
      );
    }
  }

  async function updateAccount(id: string, active: boolean) {
    try {
      await api(`/users/${id}/active`, {
        token,
        method: "PATCH",
        body: jsonBody({ active }),
      });
      await load();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not update the account.",
      );
    }
  }

  async function resetPassword(id: string) {
    try {
      const result = await api<{ temporaryPassword: string }>(
        `/users/${id}/reset-password`,
        { token, method: "POST", body: "{}" },
      );
      const account = accounts.find((item) => item.id === id);
      setTemporaryCredentials({
        name: account?.name || "HR user",
        email: account?.email || "",
        password: result.temporaryPassword,
      });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not reset the password.",
      );
    }
  }

  return (
    <>
      <section className="panel full-panel">
        <div className="panel-heading">
          <div>
            <h3>HR team access</h3>
            <p>
              Create an HR login so your people team can register employees.
            </p>
          </div>
          <button className="button primary" onClick={() => setOpen(true)}>
            ＋ Add HR
          </button>
        </div>
        {error && <div className="alert error">{error}</div>}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>NAME</th>
                <th>EMAIL</th>
                <th>STATUS</th>
                <th>CREATED</th>
                <th>ACCESS</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr key={account.id}>
                  <td>{account.name}</td>
                  <td>{account.email}</td>
                  <td>
                    <span
                      className={`badge ${account.active ? "approved" : "rejected"}`}
                    >
                      {account.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>{formatDate(account.createdAt)}</td>
                  <td>
                    <div className="row-actions">
                      <button onClick={() => resetPassword(account.id)}>
                        Reset password
                      </button>
                      <button
                        onClick={() =>
                          updateAccount(account.id, !account.active)
                        }
                      >
                        {account.active ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {accounts.length === 0 && <EmptyState text="No HR accounts yet" />}
        </div>
      </section>

      {open && (
        <div className="modal-backdrop">
          <form className="modal" onSubmit={create}>
            <div className="modal-head">
              <div>
                <div className="eyebrow">TEAM ACCESS</div>
                <h2>Create an HR login</h2>
                <p>
                  Set the email and password the HR user will use to sign in.
                </p>
              </div>
              <button
                className="close-btn"
                type="button"
                onClick={() => setOpen(false)}
              >
                ×
              </button>
            </div>
            <label>
              Full name
              <input name="name" required />
            </label>
            <label>
              Work email
              <input name="email" type="email" required />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                minLength={10}
                autoComplete="new-password"
                placeholder="At least 10 characters"
                required
              />
            </label>
            {error && <div className="alert error">{error}</div>}
            <div className="modal-actions">
              <button
                type="button"
                className="button secondary"
                onClick={() => setOpen(false)}
              >
                Cancel
              </button>
              <button className="button primary">
                Save HR and create login
              </button>
            </div>
          </form>
        </div>
      )}

      {temporaryCredentials && (
        <div className="modal-backdrop">
          <section className="modal">
            <div className="modal-mark">✓</div>
            <h2>HR login ready</h2>
            <p>
              Share these sign-in details securely. The HR user can sign in
              with this email and password.
            </p>
            <div className="account-details">
              <div>
                <span>HR name</span>
                <b>{temporaryCredentials.name}</b>
              </div>
              <div>
                <span>Work email</span>
                <b>{temporaryCredentials.email}</b>
              </div>
            </div>
            <div className="temp-password">{temporaryCredentials.password}</div>
            <button
              className="button primary full"
              onClick={() => {
                navigator.clipboard?.writeText(temporaryCredentials.password);
                setTemporaryCredentials(null);
              }}
            >
              Copy password and close
            </button>
          </section>
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

function EmptyState({ text }: { text: string }) {
  return (
    <div className="empty-state">
      <span>♙</span>
      <b>{text}</b>
      <small>HR accounts will appear here.</small>
    </div>
  );
}
