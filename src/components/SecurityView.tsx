"use client";

import { FormEvent, useState } from "react";
import { api, jsonBody } from "@/lib/api";

interface SecurityViewProps {
  token: string;
  onNavigate?: (page: string) => void;
  role?: string;
}

export default function SecurityView({
  token,
  onNavigate,
  role,
}: SecurityViewProps) {
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const newPassword = String(form.get("newPassword") || "");
    if (newPassword !== form.get("confirmPassword")) {
      setError("The new passwords do not match.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api("/auth/change-password", {
        token,
        method: "POST",
        body: jsonBody({
          currentPassword: form.get("currentPassword"),
          newPassword,
        }),
      });
      setNotice("Your password has been changed.");
      event.currentTarget.reset();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not change your password.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className="panel settings-form security-form"
      onSubmit={changePassword}
    >
      <div
        className="panel-heading"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "12px",
        }}
      >
        <div>
          <h3>Account security</h3>
          <p>Reset or update your account password. Choose a unique password with at least 10 characters.</p>
        </div>
        {onNavigate && (
          <button
            type="button"
            className="button secondary"
            onClick={() =>
              onNavigate(role === "employee" ? "My profile" : "Profile")
            }
            style={{ fontSize: 12, padding: "6px 12px", whiteSpace: "nowrap" }}
          >
            ← View profile
          </button>
        )}
      </div>
      {error && (
        <div className="alert error" role="alert">
          {error}
        </div>
      )}
      {notice && <div className="alert success">{notice}</div>}
      <label>
        Current password
        <input
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
        />
      </label>
      <label>
        New password
        <input
          name="newPassword"
          type="password"
          minLength={10}
          autoComplete="new-password"
          required
        />
      </label>
      <label>
        Confirm new password
        <input
          name="confirmPassword"
          type="password"
          minLength={10}
          autoComplete="new-password"
          required
        />
      </label>
      <button className="button primary" disabled={busy}>
        {busy ? "Saving…" : "Update password"}
      </button>
    </form>
  );
}
