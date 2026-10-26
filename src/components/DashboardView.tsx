"use client";

import { useEffect, useMemo, useState } from "react";
import { api, jsonBody } from "@/lib/api";
import { DashboardData, Role } from "@/lib/types";

interface DashboardViewProps {
  token: string;
  role: Role;
  dashboard: DashboardData;
  onNavigate: (page: string) => void;
  onDashboardChange: (dashboard: DashboardData) => void;
}

function money(value: number) {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export default function DashboardView({
  token,
  role,
  dashboard,
  onNavigate,
  onDashboardChange,
}: DashboardViewProps) {
  const today = new Date().toLocaleDateString("en-CA");
  const [from, setFrom] = useState(`${today.slice(0, 7)}-01`);
  const [to, setTo] = useState(today);
  const [department, setDepartment] = useState("");
  const [departments, setDepartments] = useState<
    { id: string; name: string }[]
  >([]);
  const [insights, setInsights] = useState<string[]>([]);
  const [summaryBusy, setSummaryBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (role === "employee") return;
    api<{ id: string; name: string }[]>("/departments", { token })
      .then(setDepartments)
      .catch(() => setDepartments([]));
  }, [role, token]);

  const metrics = dashboard.analytics;
  const cards = useMemo(() => {
    if (role === "employee") {
      return [
        [
          "Hours this week",
          `${dashboard.personal?.hours || 0} / 40h`,
          "From completed check-ins",
          "◷",
          "purple",
        ],
        [
          "Late days",
          String(dashboard.personal?.lateCount || 0),
          "In the selected period",
          "↗",
          "mint",
        ],
        [
          "Leave balance",
          `${remainingLeaveDays(dashboard.personal?.leaveBalance)} days`,
          "Across your leave types",
          "▤",
          "peach",
        ],
        [
          "Latest payslip",
          dashboard.personal?.lastPayslip?.month || "—",
          dashboard.personal?.lastPayslip
            ? money(dashboard.personal.lastPayslip.net)
            : "No finalized payslip yet",
          "＄",
          "blue",
        ],
      ];
    }
    const common = [
      [
        "Active people",
        String(metrics?.headcount || 0),
        "Active and probation",
        "♙",
        "purple",
      ],
      [
        "Attendance rate",
        `${metrics?.attendance?.rate || 0}%`,
        "For the selected period",
        "◷",
        "mint",
      ],
      [
        "On leave today",
        String(dashboard.onLeave || 0),
        "Approved for today",
        "▤",
        "peach",
      ],
      [
        "Pending approvals",
        String(dashboard.pendingLeaves || 0),
        "Leave requests",
        "✳",
        "blue",
      ],
    ];
    if (role === "admin") {
      common[1] = [
        "Attrition",
        `${metrics?.attrition || 0}%`,
        "For the selected period",
        "↗",
        "mint",
      ];
      common[2] = [
        "Payroll cost",
        money(metrics?.payroll?.gross || 0),
        "Gross in selected months",
        "＄",
        "peach",
      ];
      common[3] = [
        "Average gross",
        money(
          averageSalary(metrics?.payroll?.meanGrossByDepartmentAndDesignation),
        ),
        "By department and designation",
        "✳",
        "blue",
      ];
    }
    return common;
  }, [dashboard, metrics, role]);

  async function applyFilters() {
    setError("");
    try {
      const params = new URLSearchParams({ from, to });
      if (department) params.set("department", department);
      const result = await api<DashboardData>(`/dashboard?${params}`, {
        token,
      });
      onDashboardChange(result);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not load dashboard metrics.",
      );
    }
  }

  async function summarize() {
    setError("");
    setSummaryBusy(true);
    try {
      const result = await api<{ bullets: string[] }>("/ai/dashboard-summary", {
        token,
        method: "POST",
        body: jsonBody({ from, to, department }),
      });
      setInsights(result.bullets);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not create a summary.",
      );
    } finally {
      setSummaryBusy(false);
    }
  }

  return (
    <>
      <div className="overview-grid">
        <section className="panel welcome-panel">
          <div>
            <div className="eyebrow light">YOUR TEAM AT A GLANCE</div>
            <h2>
              A good day starts
              <br />
              with good people.
            </h2>
            <p>Take a quick look at today’s team activity.</p>
            <button
              className="button white"
              onClick={() =>
                onNavigate(role === "employee" ? "My attendance" : "Attendance")
              }
            >
              {role === "employee"
                ? "Check your attendance"
                : "View attendance"}{" "}
              <span>→</span>
            </button>
          </div>
          <div className="welcome-orb" aria-hidden="true">
            <div className="orb-circle">
              <span>✳</span>
            </div>
            <div className="orb-pill pill-one">
              <i /> Team check-in{" "}
              <b>
                {(dashboard.present || 0) + (dashboard.late || 0)} /{" "}
                {dashboard.headcount || 0}
              </b>
            </div>
            <div className="orb-pill pill-two">
              ✦ &nbsp;People first, always
            </div>
          </div>
        </section>

        <section className="panel date-panel">
          <div className="date-top">
            <span className="date-icon">◷</span>
            <span className="status-dot">Live</span>
          </div>
          <div className="eyebrow">
            TODAY,{" "}
            {new Date()
              .toLocaleDateString("en-US", { month: "short", day: "numeric" })
              .toUpperCase()}
          </div>
          <div className="date-stats">
            <div>
              <b>{dashboard.present || 0}</b>
              <small>Present</small>
            </div>
            <div>
              <b>{dashboard.late || 0}</b>
              <small>Late</small>
            </div>
            <div>
              <b>{dashboard.onLeave || 0}</b>
              <small>On leave</small>
            </div>
          </div>
          <button
            className="text-link"
            onClick={() =>
              onNavigate(role === "employee" ? "My attendance" : "Attendance")
            }
          >
            Open attendance <span>→</span>
          </button>
        </section>
      </div>

      {((role === "admin" && (dashboard.hrCount ?? 0) === 0) || role === "hr") && (
        <section
          className="panel quick-actions"
          aria-label="People setup actions"
        >
          <div>
            <div className="eyebrow">
              {role === "admin"
                ? "BUILD YOUR PEOPLE TEAM"
                : "PEOPLE OPERATIONS"}
            </div>
            <h2>
              {role === "admin" ? "Set up your HR team" : "Add a teammate"}
            </h2>
            <p>
              {role === "admin"
                ? "Create an HR login first. HR can then register employees and their sign-in accounts."
                : "Register an employee and create their secure sign-in in one step."}
            </p>
          </div>
          <div className="quick-action-buttons">
            {role === "admin" ? (
              <>
                <button
                  className="button primary"
                  onClick={() => onNavigate("Team access")}
                >
                  ＋ Add HR account
                </button>
                <button
                  className="button secondary"
                  onClick={() => onNavigate("Employees")}
                >
                  View employees
                </button>
                <button
                  className="button secondary"
                  onClick={() => onNavigate("Payroll")}
                >
                  Manage & Finalize Payroll
                </button>
              </>
            ) : (
              <button
                className="button primary"
                onClick={() => onNavigate("Employees")}
              >
                ＋ Add employee
              </button>
            )}
          </div>
        </section>
      )}

      <div className="section-title">
        <div>
          <h2>Team overview</h2>
          <p>Metrics are calculated from your organization’s records.</p>
        </div>
        <div className="filter-row">
          <label className="compact-filter">
            From
            <input
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
          </label>
          <label className="compact-filter">
            To
            <input
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
            />
          </label>
          {role !== "employee" && (
            <select
              className="select-button"
              value={department}
              onChange={(event) => setDepartment(event.target.value)}
            >
              <option value="">All departments</option>
              {departments.map((item) => (
                <option key={item.id} value={item.name}>
                  {item.name}
                </option>
              ))}
            </select>
          )}
          <button className="button secondary" onClick={applyFilters}>
            Apply
          </button>
          {role !== "employee" && (
            <button
              className="button secondary"
              onClick={summarize}
              disabled={summaryBusy}
            >
              {summaryBusy ? "Summarizing…" : "Summarize"}
            </button>
          )}
        </div>
      </div>
      {error && (
        <div className="alert error" role="alert">
          {error}
        </div>
      )}
      {insights.length > 0 && (
        <section className="panel insights-panel">
          <div className="panel-heading">
            <div>
              <h3>AI dashboard summary</h3>
              <p>AI-generated from the displayed KPI values</p>
            </div>
            <span className="badge approved">AI-generated</span>
          </div>
          <ul>
            {insights.map((insight, index) => (
              <li key={`${index}-${insight}`}>{insight}</li>
            ))}
          </ul>
        </section>
      )}

      <div className="stats-grid">
        {cards.map(([label, value, detail, icon, color]) => (
          <article className="panel stat-card" key={label}>
            <div className="stat-top">
              <span>{label}</span>
              <span className={`stat-icon ${color}`}>{icon}</span>
            </div>
            <strong>{value}</strong>
            <small>{detail}</small>
            <div className="stat-rule">
              <i
                style={{
                  width: `${Math.min(90, 15 + (Number.parseFloat(value) || 0) * 5)}%`,
                }}
              />
            </div>
          </article>
        ))}
      </div>

      {role !== "employee" && (
        <div className="lower-grid analytics-grid">
          <section className="panel table-panel">
            <div className="panel-heading">
              <div>
                <h3>Headcount by department</h3>
                <p>Active and probation employees</p>
              </div>
            </div>
            <MetricBars values={metrics?.headcountByDepartment || {}} />
          </section>
          <section className="panel table-panel">
            <div className="panel-heading">
              <div>
                <h3>Attendance by department</h3>
                <p>Present and late check-ins for the selected period</p>
              </div>
            </div>
            <MetricBars
              values={metrics?.attendanceByDepartment || {}}
              metric="late"
            />
          </section>
          <section className="panel table-panel">
            <div className="panel-heading">
              <div>
                <h3>Absenteeism by department</h3>
                <p>Absent days as a share of expected working days</p>
              </div>
            </div>
            <MetricBars
              values={metrics?.attendanceByDepartment || {}}
              metric="absenteeism"
            />
          </section>
          <section className="panel table-panel">
            <div className="panel-heading">
              <div>
                <h3>Attendance trend</h3>
                <p>Recorded workdays by month</p>
              </div>
            </div>
            <MetricBars
              values={metrics?.attendanceTrend || {}}
              metric="present"
            />
          </section>
          <section className="panel table-panel">
            <div className="panel-heading">
              <div>
                <h3>Leave utilization</h3>
                <p>Approved working days by leave type</p>
              </div>
            </div>
            <MetricBars values={metrics?.leaveUtilization || {}} />
          </section>
          {role === "admin" && (
            <>
              <section className="panel table-panel">
                <div className="panel-heading">
                  <div>
                    <h3>Payroll cost by department</h3>
                    <p>Finalized payroll gross for the selected period</p>
                  </div>
                </div>
                <MetricBars
                  values={metrics?.payroll?.byDepartment || {}}
                  metric="gross"
                />
              </section>
              <section className="panel table-panel">
                <div className="panel-heading">
                  <div>
                    <h3>Gender mix</h3>
                    <p>Employee profile breakdown</p>
                  </div>
                </div>
                <MetricBars values={metrics?.genderBreakdown || {}} />
              </section>
              <section className="panel table-panel">
                <div className="panel-heading">
                  <div>
                    <h3>Employee tenure</h3>
                    <p>Time with the organization</p>
                  </div>
                </div>
                <MetricBars values={metrics?.tenureBreakdown || {}} />
              </section>
            </>
          )}
          <section className="panel table-panel">
            <div className="panel-heading">
              <div>
                <h3>Most late check-ins</h3>
                <p>Top five for the selected period</p>
              </div>
            </div>
            <ol className="late-list">
              {(metrics?.topLateComers || []).map((person: any) => (
                <li key={person.name}>
                  <span>
                    {person.name}
                    <small>{person.department}</small>
                  </span>
                  <b>{person.count}</b>
                </li>
              ))}
              {!metrics?.topLateComers?.length && (
                <Empty text="No late check-ins in this period" />
              )}
            </ol>
          </section>
          <section className="panel table-panel">
            <div className="panel-heading">
              <div>
                <h3>Announcements</h3>
                <p>Latest notes for your team</p>
              </div>
              <button
                className="text-link"
                onClick={() => onNavigate("Announcements")}
              >
                See all
              </button>
            </div>
            {(dashboard.announcements || []).slice(0, 3).map((item: any) => (
              <article className="dashboard-announcement" key={item.id}>
                <b>{item.title}</b>
                <p>{item.body}</p>
              </article>
            ))}
            {!dashboard.announcements?.length && (
              <Empty text="No announcements yet" />
            )}
          </section>
        </div>
      )}
    </>
  );
}

function averageSalary(values: Record<string, number> | undefined) {
  const salaries = Object.values(values || {});
  return salaries.length
    ? salaries.reduce((sum, value) => sum + value, 0) / salaries.length
    : 0;
}

function remainingLeaveDays(balances: any[] | undefined) {
  return (balances || []).reduce(
    (sum, balance) => sum + (balance.remaining || 0),
    0,
  );
}

function MetricBars({
  values,
  metric,
}: {
  values: Record<string, any>;
  metric?: string;
}) {
  const entries = Object.entries(values);
  const max = Math.max(
    1,
    ...entries.map(([, value]) =>
      Number(
        metric
          ? value?.[metric]
          : typeof value === "object"
            ? value?.percent
            : value,
      ),
    ),
  );
  if (!entries.length) return <Empty text="No records for this period" />;
  return (
    <div className="metric-bars">
      {entries.slice(0, 8).map(([name, raw]) => {
        const value = Number(
          metric ? raw?.[metric] : typeof raw === "object" ? raw?.percent : raw,
        );
        return (
          <div className="metric-bar-row" key={name}>
            <span>{name}</span>
            <div>
              <i style={{ width: `${Math.max(3, (value / max) * 100)}%` }} />
            </div>
            <b>{value}</b>
          </div>
        );
      })}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="empty-state">
      <span>✳</span>
      <b>{text}</b>
      <small>New activity will show here.</small>
    </div>
  );
}
