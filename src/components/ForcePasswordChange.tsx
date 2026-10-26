"use client";

import { FormEvent, useState } from "react";
import { api, jsonBody } from "@/lib/api";

interface ForcePasswordChangeProps {
  token: string;
  onComplete: () => void;
}

export default function ForcePasswordChange({
  token,
  onComplete,
}: ForcePasswordChangeProps) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const newPassword = String(form.get("newPassword") || "");
    if (newPassword !== form.get("confirmPassword")) {
      setError("The new passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      await api("/auth/change-password", {
        token,
        method: "POST",
        body: jsonBody({
          currentPassword: form.get("currentPassword"),
          newPassword,
        }),
      });
      onComplete();
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
    <div className="modal-backdrop">
      <form className="modal" onSubmit={submit}>
        <div className="modal-mark">⌑</div>
        <h2>Change your temporary password</h2>
        <p>Set a new password to continue. Use at least 10 characters.</p>
        <label>
          Temporary password
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
        {error && (
          <div className="alert error" role="alert">
            {error}
          </div>
        )}
        <button className="button primary full" disabled={busy}>
          {busy ? "Saving…" : "Set new password"}
        </button>
      </form>
    </div>
  );
}
