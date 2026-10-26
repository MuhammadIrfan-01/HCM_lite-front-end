"use client";

import { useEffect, useMemo, useState } from "react";
import AuthPanel from "@/components/AuthPanel";
import ForcePasswordChange from "@/components/ForcePasswordChange";
import DashboardView from "@/components/DashboardView";
import EmployeesView from "@/components/EmployeesView";
import AttendanceView from "@/components/AttendanceView";
import LeaveView from "@/components/LeaveView";
import PayrollView from "@/components/PayrollView";
import OrganizationView from "@/components/OrganizationView";
import AssistantView from "@/components/AssistantView";
import HRAccountsView from "@/components/HRAccountsView";
import AnnouncementsView from "@/components/AnnouncementsView";
import NotificationsView from "@/components/NotificationsView";
import AuditView from "@/components/AuditView";
import ProfileView from "@/components/ProfileView";
import SecurityView from "@/components/SecurityView";
import ThemeToggle from "@/components/ThemeToggle";
import { api } from "@/lib/api";
import { DashboardData, User } from "@/lib/types";

const roleMenus: Record<User["role"], string[]> = {
  admin: [
    "Overview",
    "Employees",
    "Team access",
    "Attendance",
    "Leave",
    "Payroll",
    "Organization",
    "Announcements",
    "Notifications",
    "Audit log",
  ],
  hr: [
    "Overview",
    "Employees",
    "Attendance",
    "Leave",
    "Payroll",
    "Organization",
    "Announcements",
    "Notifications",
  ],
  employee: [
    "Overview",
    "My attendance",
    "My leave",
    "Payslips",
    "Announcements",
    "Notifications",
    "My profile",
  ],
};

export default function Home() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [page, setPage] = useState("Overview");
  const [loading, setLoading] = useState(true);
  const [initializationError, setInitializationError] = useState("");
  const [notificationCount, setNotificationCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    initialize().catch((error) => {
      setInitializationError(
        error instanceof Error
          ? error.message
          : "Could not connect to the HCM Lite API.",
      );
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!token || !user || user.mustChangePassword) return;
    loadDashboard(token).catch((error) =>
      setInitializationError(error.message),
    );
    refreshNotificationCount(token);
  }, [token, user]);

  const menus = useMemo(() => (user ? roleMenus[user.role] : []), [user]);
  const title =
    page === "Overview" && user
      ? `Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, ${user.name.split(" ")[0]}`
      : page;

  async function initialize() {
    const storedToken = localStorage.getItem("hcm_token");
    if (storedToken) {
      try {
        const result = await api<{ user: User }>("/auth/me", {
          token: storedToken,
        });
        setToken(storedToken);
        setUser(result.user);
        setLoading(false);
        return;
      } catch {
        localStorage.removeItem("hcm_token");
      }
    }
    setLoading(false);
  }

  async function loadDashboard(accessToken: string) {
    const result = await api<DashboardData>("/dashboard", {
      token: accessToken,
    });
    setDashboard(result);
  }

  async function refreshNotificationCount(accessToken: string) {
    try {
      const notifications = await api<any[]>("/notifications", {
        token: accessToken,
      });
      setNotificationCount(
        notifications.filter((item) => !item.read_at).length,
      );
    } catch {
      setNotificationCount(0);
    }
  }

  function authenticate(accessToken: string, authenticatedUser: User) {
    localStorage.setItem("hcm_token", accessToken);
    setToken(accessToken);
    setUser(authenticatedUser);
    setDashboard(null);
    setInitializationError("");
  }

  function signOut() {
    localStorage.removeItem("hcm_token");
    setToken(null);
    setUser(null);
    setDashboard(null);
    setPage("Overview");
    setInitializationError("");
  }

  function changePage(nextPage: string) {
    setPage(nextPage);
    setInitializationError("");
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="loader" />
        Connecting to HCM Lite
      </div>
    );
  }

  if (!user || !token) {
    if (initializationError) {
      return (
        <main className="connection-error">
          <div className="brand">
            <span className="brand-icon">h</span>
            <b>
              hcm<span>lite</span>
            </b>
          </div>
          <section className="panel">
            <h1>HCM Lite could not connect</h1>
            <p>{initializationError}</p>
            <p>
              Check that the HCM Lite API is running and its local data folder
              is writable.
            </p>
            <button
              className="button primary"
              onClick={() => window.location.reload()}
            >
              Try again
            </button>
          </section>
        </main>
      );
    }
    return <AuthPanel onAuthenticated={authenticate} />;
  }

  if (!dashboard && !user.mustChangePassword) {
    return (
      <div className="loading">
        <div className="loader" />
        Loading your workspace
      </div>
    );
  }

  return (
    <div className={`app-shell ${sidebarOpen ? "sidebar-active" : ""}`}>
      <div
        className={`sidebar-backdrop ${sidebarOpen ? "open" : ""}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-header-row">
          <div className="brand side-brand">
            <span className="brand-icon">h</span>
            <b>
              hcm<span>lite</span>
            </b>
          </div>
          <button
            type="button"
            className="sidebar-close-btn"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            ×
          </button>
        </div>
        <div className="workspace">
          <div className="workspace-symbol">
            {(dashboard?.company || "C")[0]}
          </div>
          <div>
            <b>{dashboard?.company || "Your workspace"}</b>
            <small>People workspace</small>
          </div>
          <span className="chevron">⌄</span>
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav aria-label="Main navigation">
          {menus.map((item, index) => (
            <button
              key={item}
              onClick={() => {
                changePage(item);
                setSidebarOpen(false);
              }}
              className={`nav-item ${page === item ? "active" : ""}`}
              aria-current={page === item ? "page" : undefined}
            >
              <span className="nav-icon">{navigationIcon(item, index)}</span>
              {item}
              {item === "Notifications" && notificationCount > 0 && (
                <i className="nav-count">{notificationCount}</i>
              )}
              {item === "Leave" && (dashboard?.pendingLeaves ?? 0) > 0 && (
                <i className="nav-count">{dashboard?.pendingLeaves}</i>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card">
            <span className="help-spark">✳</span>
            <b>Need a hand?</b>
            <p>
              Ask the assistant about people, policies, and your available data.
            </p>
            <button
              onClick={() => {
                changePage("Assistant");
                setSidebarOpen(false);
              }}
            >
              Ask the assistant <span>↗</span>
            </button>
          </div>
          <div className="sidebar-profile-card">
            <button
              type="button"
              className={`profile ${page === "Profile" || page === "My profile" ? "active" : ""}`}
              onClick={() => {
                changePage(user.role === "employee" ? "My profile" : "Profile");
                setSidebarOpen(false);
              }}
              title="View profile"
              aria-label="View profile"
            >
              <span className="person-avatar">{initials(user.name)}</span>
              <span className="person-meta">
                <b>{user.name}</b>
                <small>{user.role}</small>
              </span>
            </button>
            <button
              type="button"
              className={`sidebar-security-btn ${page === "Security" ? "active" : ""}`}
              onClick={() => {
                changePage("Security");
                setSidebarOpen(false);
              }}
              title="Security & Password"
              aria-label="Security & Password"
            >
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="mobile-menu-btn"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <svg
                viewBox="0 0 24 24"
                width="20"
                height="20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <div className="crumb">
              Workspace <span>/</span> <b>{page}</b>
            </div>
          </div>
          <div className="top-actions">
            <button
              className="icon-button"
              aria-label="Notifications"
              onClick={() => changePage("Notifications")}
            >
              ♧{notificationCount > 0 && <i />}
            </button>
            <ThemeToggle />
            <span className="top-divider" />
            <button
              type="button"
              className="topbar-logout-btn"
              onClick={signOut}
              title="Log out of your account"
              aria-label="Log out"
            >
              <svg
                className="logout-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span>Logout</span>
            </button>
          </div>
        </header>

        <div className="content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </div>
              <h1>{title}</h1>
              <p>{pageDescription(page)}</p>
            </div>
          </div>
          {initializationError && (
            <div className="alert error" role="alert">
              {initializationError}
              <button onClick={() => setInitializationError("")}>×</button>
            </div>
          )}

          {page === "Overview" && dashboard && (
            <DashboardView
              token={token}
              role={user.role}
              dashboard={dashboard}
              onNavigate={changePage}
              onDashboardChange={setDashboard}
            />
          )}
          {page === "Employees" && (
            <EmployeesView token={token} role={user.role} />
          )}
          {(page === "Attendance" || page === "My attendance") && (
            <AttendanceView token={token} role={user.role} />
          )}
          {(page === "Leave" || page === "My leave") && (
            <LeaveView token={token} role={user.role} />
          )}
          {(page === "Payroll" || page === "Payslips") && (
            <PayrollView token={token} role={user.role} />
          )}
          {page === "Organization" && (
            <OrganizationView token={token} role={user.role} />
          )}
          {page === "Team access" && user.role === "admin" && (
            <HRAccountsView token={token} />
          )}
          {page === "Announcements" && (
            <AnnouncementsView token={token} role={user.role} />
          )}
          {page === "Notifications" && <NotificationsView token={token} />}
          {page === "Audit log" && user.role === "admin" && (
            <AuditView token={token} />
          )}
          {(page === "Profile" || page === "My profile") && (
            <ProfileView
              token={token}
              user={user}
              company={dashboard?.company}
              onNavigate={changePage}
            />
          )}
          {page === "Assistant" && (
            <AssistantView
              token={token}
              role={user.role}
              userName={user.name}
              onNavigate={changePage}
            />
          )}
          {page === "Security" && (
            <SecurityView
              token={token}
              onNavigate={changePage}
              role={user.role}
            />
          )}
        </div>
        <footer className="footer">
          © 2026 HCM Lite <span>Made for people, built for work.</span>
        </footer>
      </main>
      {user.mustChangePassword && token && (
        <ForcePasswordChange
          token={token}
          onComplete={() => setUser({ ...user, mustChangePassword: false })}
        />
      )}
    </div>
  );
}

function pageDescription(page: string) {
  const descriptions: Record<string, string> = {
    Overview: "Here’s what’s happening across your team today.",
    Employees: "Your people, all in one place.",
    "Team access": "Create and maintain HR login access.",
    Attendance: "Review check-ins, working time, and corrections.",
    "My attendance": "Check in, check out, and review your calendar.",
    Leave: "Review employee requests and decisions.",
    "My leave": "Check balances, request time away, and review decisions.",
    Payroll: "Prepare, review, and finalize monthly payroll.",
    Payslips: "View and download your finalized payslips.",
    Organization:
      "Manage company rules, departments, leave types, and holidays.",
    Announcements: "Company news and team updates.",
    Notifications: "Personal updates about leave and payroll.",
    "Audit log": "Read the append-only history of important actions.",
    "My profile": "Update your personal contact details.",
    Profile: "View and manage your personal account details.",
    Assistant: "Ask questions about your permitted data and company policy.",
    Security: "Reset or update your account password.",
  };
  return descriptions[page] || "Your HCM Lite workspace.";
}

function navigationIcon(page: string, index: number) {
  const icons: Record<string, string> = {
    Overview: "◫",
    Employees: "♙",
    "Team access": "♧",
    Attendance: "◷",
    "My attendance": "◷",
    Leave: "▤",
    "My leave": "▤",
    Payroll: "＄",
    Payslips: "▧",
    Organization: "⚙",
    Announcements: "✳",
    Notifications: "♧",
    "Audit log": "◉",
    "My profile": "◉",
    Profile: "◉",
    Assistant: "✳",
    Security: "⌑",
  };
  return icons[page] || ["◫", "♙", "◷", "▤", "▧", "◉", "⚙"][index % 7];
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
