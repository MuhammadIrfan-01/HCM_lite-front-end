"use client";

import { FormEvent, useEffect, useState } from "react";
import { api, jsonBody } from "@/lib/api";
import { User } from "@/lib/types";
import ThemeToggle from "@/components/ThemeToggle";

type RoleType = "admin" | "hr" | "employee";

interface RoleMeta {
  id: RoleType;
  label: string;
  badge: string;
  title: string;
  desc: string;
}

const ROLES: RoleMeta[] = [
  {
    id: "admin",
    label: "Admin",
    badge: "Full Control",
    title: "Administrator Portal",
    desc: "Complete system access: manage organization settings, team permissions, audit logs, and global policies.",
  },
  {
    id: "hr",
    label: "HR",
    badge: "People & Ops",
    title: "HR Management Portal",
    desc: "Oversee employee directory, track real-time attendance, review leave requests, and manage payroll.",
  },
  {
    id: "employee",
    label: "Employee",
    badge: "Self-Service",
    title: "Employee Portal",
    desc: "Clock in/out for shifts, monitor attendance history, submit leave applications, and view payslips.",
  },
];

export default function AuthPanel({
  onAuthenticated,
}: {
  onAuthenticated: (token: string, user: User) => void;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [role, setRole] = useState<RoleType>("admin");
  const [signup, setSignup] = useState(false);
  const [setupError, setSetupError] = useState("");
  const [setupChecked, setSetupChecked] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    api<{ complete: boolean }>("/setup/status")
      .then(({ complete }) => setSignup(!complete))
      .catch((requestError) => {
        setSetupError(
          requestError instanceof Error
            ? requestError.message
            : "Could not check company setup status.",
        );
      })
      .finally(() => setSetupChecked(true));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const payload = signup
      ? {
          company: form.get("company"),
          name: form.get("name"),
          email: form.get("email"),
          password: form.get("password"),
          officeStart: form.get("officeStart"),
          graceMinutes: Number(form.get("graceMinutes")),
        }
      : {
          email: form.get("email"),
          password: form.get("password"),
          role,
          company: form.get("company"),
        };
    try {
      const result = await api<{ token: string; user: User }>(
        signup ? "/auth/admin-signup" : "/auth/login",
        { method: "POST", body: jsonBody(payload) },
      );
      onAuthenticated(result.token, result.user);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to sign in.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (!setupChecked)
    return (
      <div className="loading">
        <div className="loader" />
        Checking company setup…
      </div>
    );

  const activeRoleMeta = ROLES.find((r) => r.id === role) || ROLES[0];

  return (
    <main className="auth-page">
      <section className="auth-art" aria-label="HCM Lite platform overview">
        <div className="auth-art-glow" aria-hidden="true" />
        <div className="auth-art-container">
          <header className="auth-art-header">
            <div className="brand">
              <span className="brand-icon">h</span>
              <b>
                hcm<span>lite</span>
              </b>
            </div>
            <span className="art-version-badge">Enterprise v2.0</span>
          </header>

          <div className="art-copy">
            <div className="eyebrow art-eyebrow">
              <span className="art-sparkle">✦</span> MODERN WORKFORCE PLATFORM
            </div>
            <h1>Human Capital Management, Simplified.</h1>
            <p>
              A unified platform connecting Administrators, HR leaders, and
              Employees with seamless attendance, automated payroll, and instant
              approvals.
            </p>

            <div className="art-highlights">
              <div className="art-highlight-item">
                <span className="art-highlight-icon">✓</span>
                <div>
                  <b>Tailored Workspaces</b>
                  <small>Custom interfaces for Admin, HR & Employee</small>
                </div>
              </div>
              <div className="art-highlight-item">
                <span className="art-highlight-icon">✓</span>
                <div>
                  <b>Smart Attendance & Leaves</b>
                  <small>Automated late detection with grace periods</small>
                </div>
              </div>
              <div className="art-highlight-item">
                <span className="art-highlight-icon">✓</span>
                <div>
                  <b>Automated Payroll</b>
                  <small>Salary slips & allowances generated in one click</small>
                </div>
              </div>
            </div>

            <div className="art-preview-card">
              <div className="art-preview-header">
                <span className="status-live-dot" />
                <span className="preview-label">Live Workspace Active</span>
                <span className="preview-pill">SECURE SSL</span>
              </div>
              <div className="art-preview-stats">
                <div className="art-stat">
                  <strong>3 Roles</strong>
                  <span>Dedicated Portals</span>
                </div>
                <div className="art-stat-divider" />
                <div className="art-stat">
                  <strong>100%</strong>
                  <span>Audit Logged</span>
                </div>
                <div className="art-stat-divider" />
                <div className="art-stat">
                  <strong>Instant</strong>
                  <span>Access Sync</span>
                </div>
              </div>
            </div>
          </div>

          <footer className="art-bottom">
            <div className="art-social-proof">
              <div className="avatar-stack">
                <i>AD</i>
                <i>HR</i>
                <i>EM</i>
                <i>+</i>
              </div>
              <span>Trusted by high-performing organizations</span>
            </div>
            <div className="art-legal-note">
              <span>Encrypted Authentication</span>
              <span>·</span>
              <span>ISO 27001 Ready</span>
            </div>
          </footer>
        </div>
      </section>

      <section className="auth-side">
        <div className="auth-theme-switch">
          <ThemeToggle />
        </div>

        <div className="mobile-brand brand">
          <span className="brand-icon">h</span>
          <b>
            hcm<span>lite</span>
          </b>
        </div>

        <form className="auth-form" onSubmit={submit}>
          <div className="auth-form-head">
            <div className="eyebrow auth-eyebrow">
              <span className="eyebrow-dot" />
              {signup ? "COMPANY REGISTRATION" : "PORTAL ACCESS"}
            </div>
            <h2>{signup ? "Create company account" : "Sign in to HCM Lite"}</h2>
            <p className="auth-form-subtitle">
              {signup
                ? "Configure your company profile and primary administrator."
                : "Choose your workspace role and enter your credentials."}
            </p>
          </div>

          {!signup && (
            <div className="auth-role-section">
              <div className="auth-role-label-row">
                <span className="auth-role-label">Select your role</span>
                <span className="auth-role-hint">Required for authentication</span>
              </div>

              <div
                className="auth-role-options auth-role-cards"
                role="radiogroup"
                aria-label="Choose your role"
              >
                {ROLES.map((item) => {
                  const isActive = role === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="radio"
                      aria-checked={isActive}
                      className={`auth-role-option auth-role-card role-${item.id} ${
                        isActive ? "active" : ""
                      }`}
                      onClick={() => setRole(item.id)}
                    >
                      <div className="role-card-top">
                        <span className="role-card-icon" aria-hidden="true">
                          {item.id === "admin" && (
                            <svg
                              width="18"
                              height="18"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                              <path d="m9 12 2 2 4-4" />
                            </svg>
                          )}
                          {item.id === "hr" && (
                            <svg
                              width="18"
                              height="18"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                              <circle cx="9" cy="7" r="4" />
                              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </svg>
                          )}
                          {item.id === "employee" && (
                            <svg
                              width="18"
                              height="18"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <rect width="18" height="18" x="3" y="3" rx="2" />
                              <circle cx="12" cy="10" r="3" />
                              <path d="M7 21v-2a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2" />
                            </svg>
                          )}
                        </span>
                        <span className="role-card-indicator" aria-hidden="true">
                          {isActive && (
                            <svg
                              width="11"
                              height="11"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </span>
                      </div>
                      <div className="role-card-info">
                        <span className="role-card-title">{item.label}</span>
                        <span className="role-card-badge">{item.badge}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Dynamic Contextual Helper Banner */}
              <div className={`auth-role-desc role-${role}`}>
                <div className="role-desc-indicator" />
                <div className="role-desc-body">
                  <div className="role-desc-heading">
                    <span className="role-desc-tag">
                      {activeRoleMeta.label}
                    </span>
                    <strong>{activeRoleMeta.title}</strong>
                  </div>
                  <p className="role-desc-text">{activeRoleMeta.desc}</p>
                </div>
              </div>
            </div>
          )}

          {signup ? (
            <div className="auth-signup-fields">
              <label className="auth-field">
                <span className="field-label">Company Name</span>
                <div className="input-with-icon">
                  <span className="field-icon" aria-hidden="true">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect width="16" height="20" x="4" y="2" rx="2" ry="2" />
                      <path d="M9 22v-4h6v4" />
                      <path d="M8 6h.01" />
                      <path d="M16 6h.01" />
                      <path d="M12 6h.01" />
                      <path d="M12 10h.01" />
                    </svg>
                  </span>
                  <input
                    name="company"
                    placeholder="e.g. Acme Corporation"
                    required
                  />
                </div>
              </label>

              <label className="auth-field">
                <span className="field-label">Primary Admin Name</span>
                <div className="input-with-icon">
                  <span className="field-icon" aria-hidden="true">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </span>
                  <input name="name" placeholder="First and last name" required />
                </div>
              </label>

              <div className="auth-grid-2">
                <label className="auth-field">
                  <span className="field-label">Office Start Time</span>
                  <input
                    name="officeStart"
                    type="time"
                    defaultValue="09:00"
                    required
                  />
                </label>
                <label className="auth-field">
                  <span className="field-label">Grace Period (Min)</span>
                  <input
                    name="graceMinutes"
                    type="number"
                    min="0"
                    max="180"
                    defaultValue="15"
                    required
                  />
                </label>
              </div>
            </div>
          ) : (
            <label className="auth-field">
              <span className="field-label">Company Name</span>
              <div className="input-with-icon">
                <span className="field-icon" aria-hidden="true">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect width="16" height="20" x="4" y="2" rx="2" ry="2" />
                    <path d="M9 22v-4h6v4" />
                    <path d="M8 6h.01" />
                    <path d="M16 6h.01" />
                    <path d="M12 6h.01" />
                    <path d="M12 10h.01" />
                  </svg>
                </span>
                <input
                  name="company"
                  autoComplete="organization"
                  placeholder="Enter registered company name"
                  required
                />
              </div>
            </label>
          )}

          <label className="auth-field">
            <span className="field-label">Work Email</span>
            <div className="input-with-icon">
              <span className="field-icon" aria-hidden="true">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect width="20" height="16" x="2" y="4" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
              </span>
              <input
                name="email"
                type="email"
                autoComplete="username"
                placeholder="name@company.com"
                required
              />
            </div>
          </label>

          <label className="auth-field">
            <div className="field-label">
              <span>Password</span>
              {signup && (
                <span className="field-hint">Min. 10 characters</span>
              )}
            </div>
            <div className="input-with-icon">
              <span className="field-icon" aria-hidden="true">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete={signup ? "new-password" : "current-password"}
                minLength={signup ? 10 : 1}
                placeholder={signup ? "Create a secure password" : "Enter password"}
                required
              />
              <button
                type="button"
                className="toggle-password-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                    <line x1="2" x2="22" y1="2" y2="22" />
                  </svg>
                ) : (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </label>

          {(error || setupError) && (
            <div className="alert error auth-error-alert" role="alert">
              <span className="alert-icon" aria-hidden="true">⚠️</span>
              <span className="alert-text">{error || setupError}</span>
            </div>
          )}

          <button
            className="button primary full auth-submit-btn"
            disabled={busy}
          >
            <span className="auth-btn-text">
              {busy
                ? "Authenticating…"
                : signup
                  ? "Create company account"
                  : `Sign in as ${role === "hr" ? "HR Manager" : role === "admin" ? "Admin" : "Employee"}`}
            </span>
            <span className="auth-btn-arrow" aria-hidden="true">
              {busy ? (
                <span className="auth-spinner" />
              ) : (
                "→"
              )}
            </span>
          </button>

          <div className="auth-foot">
            <button
              type="button"
              className="auth-mode-switch"
              onClick={() => {
                setSignup(!signup);
                setError("");
              }}
            >
              {signup
                ? "← Already set up? Back to sign in"
                : "Admin sign up · Register new company"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
