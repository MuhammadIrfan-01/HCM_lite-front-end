"use client";

import { FormEvent, useEffect, useState } from "react";
import { api, jsonBody } from "@/lib/api";
import { User } from "@/lib/types";

interface ProfileViewProps {
  token: string;
  user: User;
  company?: string;
  onNavigate?: (page: string) => void;
}

export default function ProfileView({
  token,
  user,
  company,
  onNavigate,
}: ProfileViewProps) {
  const [profile, setProfile] = useState<any>({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user.role === "employee") {
      api<any>("/employees/me", { token })
        .then(setProfile)
        .catch((requestError) => setError(requestError.message));
    }
  }, [token, user.role]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError("");
    setNotice("");
    setSaving(true);
    try {
      await api("/employees/me", {
        token,
        method: "PATCH",
        body: jsonBody({
          phone: form.get("phone"),
          address: form.get("address"),
        }),
      });
      setNotice("Your contact information was updated.");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not save your profile.",
      );
    } finally {
      setSaving(false);
    }
  }

  const roleLabels: Record<string, string> = {
    admin: "System Administrator",
    hr: "HR Manager",
    employee: "Employee",
  };

  return (
    <div className="panel settings-form">
      <div className="panel-heading">
        <div>
          <h3>Account profile</h3>
          <p>
            {user.role === "employee"
              ? "Update your personal contact details. Job and salary details are managed by HR."
              : "View your account details and manage credentials."}
          </p>
        </div>
      </div>

      <div className="profile-security-banner">
        <div className="profile-security-text">
          <strong>Password & Security</strong>
          <span>Reset or change your account password anytime</span>
        </div>
        {onNavigate && (
          <button
            type="button"
            className="button secondary"
            onClick={() => onNavigate("Security")}
          >
            <svg
              viewBox="0 0 24 24"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              style={{ marginRight: 6 }}
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Reset / change password
          </button>
        )}
      </div>

      {error && <div className="alert error">{error}</div>}
      {notice && <div className="alert success">{notice}</div>}

      {user.role === "employee" ? (
        <form onSubmit={save} className="settings-fields">
          <label>
            Full name
            <input value={profile.name || user.name || ""} disabled />
          </label>
          <label>
            Work email
            <input value={profile.email || user.email || ""} disabled />
          </label>
          <label>
            Department
            <input value={profile.department || "General"} disabled />
          </label>
          <label>
            Phone
            <input
              name="phone"
              defaultValue={profile.phone || ""}
              placeholder="e.g. +1 555-0199"
            />
          </label>
          <label>
            Address
            <textarea
              name="address"
              defaultValue={profile.address || ""}
              placeholder="Your residential address"
            />
          </label>
          <button className="button primary" disabled={saving}>
            {saving ? "Saving…" : "Save profile"}
          </button>
        </form>
      ) : (
        <div className="settings-fields">
          <label>
            Full name
            <input value={user.name} disabled />
          </label>
          <label>
            Work email
            <input value={user.email} disabled />
          </label>
          <label>
            Role
            <input value={roleLabels[user.role] || user.role} disabled />
          </label>
          <label>
            Workspace
            <input value={company || "HCM Lite Workspace"} disabled />
          </label>
          <label>
            Account status
            <input value="Active" disabled />
          </label>
        </div>
      )}
    </div>
  );
}
