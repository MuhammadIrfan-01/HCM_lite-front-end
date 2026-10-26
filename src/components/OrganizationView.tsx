"use client";

import { FormEvent, useEffect, useState } from "react";
import { api, jsonBody } from "@/lib/api";
import { Role } from "@/lib/types";

interface OrganizationViewProps {
  token: string;
  role: Role;
}

const WEEKDAYS = [
  { label: "Sun", name: "Sunday", index: 0 },
  { label: "Mon", name: "Monday", index: 1 },
  { label: "Tue", name: "Tuesday", index: 2 },
  { label: "Wed", name: "Wednesday", index: 3 },
  { label: "Thu", name: "Thursday", index: 4 },
  { label: "Fri", name: "Friday", index: 5 },
  { label: "Sat", name: "Saturday", index: 6 },
];

export default function OrganizationView({
  token,
  role,
}: OrganizationViewProps) {
  const [settings, setSettings] = useState<any>({});
  const [departments, setDepartments] = useState<any[]>([]);
  const [designations, setDesignations] = useState<any[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [savingRules, setSavingRules] = useState(false);
  const [selectedWeekends, setSelectedWeekends] = useState<number[]>([0, 6]);
  const [activeTab, setActiveTab] = useState<
    "all" | "rules" | "structure" | "timeoff"
  >("all");

  async function load() {
    const [
      currentSettings,
      departmentRows,
      designationRows,
      typeRows,
      holidayRows,
    ] = await Promise.all([
      api<any>("/settings", { token }),
      api<any[]>("/departments", { token }),
      api<any[]>("/designations", { token }),
      api<any[]>("/leave-types", { token }),
      api<any[]>("/holidays", { token }),
    ]);
    setSettings(currentSettings);
    if (Array.isArray(currentSettings.weekend)) {
      setSelectedWeekends(currentSettings.weekend);
    }
    setDepartments(departmentRows);
    setDesignations(designationRows);
    setLeaveTypes(typeRows);
    setHolidays(holidayRows);
  }

  useEffect(() => {
    load().catch((requestError) => setError(requestError.message));
  }, [token]);

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const latitude = String(form.get("officeLatitude") || "").trim();
    const longitude = String(form.get("officeLongitude") || "").trim();
    const payload = {
      company: form.get("company"),
      officeStart: form.get("officeStart"),
      officeEnd: form.get("officeEnd") || "17:00",
      graceMinutes: Number(form.get("graceMinutes")),
      halfDayHours: Number(form.get("halfDayHours")),
      weekend: selectedWeekends,
      officeLatitude: latitude ? Number(latitude) : null,
      officeLongitude: longitude ? Number(longitude) : null,
      officeRadiusMeters: Number(form.get("officeRadiusMeters")),
    };
    setSavingRules(true);
    await perform(async () => {
      await api("/settings", { token, method: "PUT", body: jsonBody(payload) });
      setNotice("Organization rules and schedule saved successfully.");
      await load();
    });
    setSavingRules(false);
  }

  async function addRecord(path: string, payload: unknown, message: string) {
    await perform(async () => {
      await api(path, { token, method: "POST", body: jsonBody(payload) });
      setNotice(message);
      await load();
    });
  }

  async function removeRecord(path: string, message: string) {
    if (!window.confirm(`Deactivate or remove this ${message}?`)) return;
    await perform(async () => {
      await api(path, { token, method: "DELETE" });
      setNotice(`${capitalize(message)} removed.`);
      await load();
    });
  }

  async function updateLeaveType(item: any, form: FormData) {
    await perform(async () => {
      await api(`/leave-types/${item.id || item._id}`, {
        token,
        method: "PUT",
        body: jsonBody({
          quota: Number(form.get("quota")),
          paid: form.get("paid") === "on",
        }),
      });
      setNotice("Leave quota updated.");
      await load();
    });
  }

  async function perform(action: () => Promise<void>) {
    setError("");
    setNotice("");
    try {
      await action();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not save this change.",
      );
    }
  }

  function toggleWeekend(dayIndex: number) {
    if (!editable) return;
    setSelectedWeekends((prev) =>
      prev.includes(dayIndex)
        ? prev.filter((d) => d !== dayIndex)
        : [...prev, dayIndex].sort((a, b) => a - b),
    );
  }

  const editable = role === "admin" || role === "hr";
  const canManageStructure = role === "admin" || role === "hr";

  return (
    <div className="org-container">
      {error && (
        <div className="alert error" role="alert">
          {error}
          <button onClick={() => setError("")}>×</button>
        </div>
      )}
      {notice && (
        <div className="alert success" role="status">
          {notice}
          <button onClick={() => setNotice("")}>×</button>
        </div>
      )}

      {/* Top Header & Quick Stats */}
      <div className="org-header-card">
        <div className="org-header-info">
          <h2>Organization & Workplace Settings</h2>
          <p>
            Configure company identity, working hours, team structure, and leave policies.
          </p>
        </div>
        <div className="org-stats-strip">
          <div className="org-stat-pill">
            <span>🏢</span>
            <span>
              Departments: <b>{departments.length}</b>
            </span>
          </div>
          <div className="org-stat-pill">
            <span>💼</span>
            <span>
              Designations: <b>{designations.length}</b>
            </span>
          </div>
          <div className="org-stat-pill">
            <span>🏖</span>
            <span>
              Leave types: <b>{leaveTypes.length}</b>
            </span>
          </div>
          <div className="org-stat-pill">
            <span>📅</span>
            <span>
              Holidays: <b>{holidays.length}</b>
            </span>
          </div>
        </div>
      </div>

      {/* Tab Navigation Filter */}
      <nav className="org-tab-strip" aria-label="Organization sections">
        <button
          type="button"
          className={`org-tab-btn ${activeTab === "all" ? "active" : ""}`}
          onClick={() => setActiveTab("all")}
        >
          All Sections
        </button>
        <button
          type="button"
          className={`org-tab-btn ${activeTab === "rules" ? "active" : ""}`}
          onClick={() => setActiveTab("rules")}
        >
          ⚙ Work Rules & Schedule
        </button>
        <button
          type="button"
          className={`org-tab-btn ${activeTab === "structure" ? "active" : ""}`}
          onClick={() => setActiveTab("structure")}
        >
          👥 Departments & Designations
        </button>
        <button
          type="button"
          className={`org-tab-btn ${activeTab === "timeoff" ? "active" : ""}`}
          onClick={() => setActiveTab("timeoff")}
        >
          🏖 Leave Types & Holidays
        </button>
      </nav>

      {/* 1. Company & Attendance Rules Form */}
      {(activeTab === "all" || activeTab === "rules") && (
        <form
          className="org-rules-card"
          onSubmit={saveSettings}
          key={JSON.stringify(settings)}
        >
          <div className="panel-heading">
            <div>
              <h3>Company and attendance rules</h3>
              <p>
                Configure work schedules, grace periods, weekends, and geofence verification.
              </p>
            </div>
          </div>

          <div className="org-section-title">
            <span>⏱</span> Work Hours & Thresholds
          </div>
          <div className="org-form-row">
            <div className="org-input-group">
              <label htmlFor="company-name">Company name</label>
              <input
                id="company-name"
                name="company"
                defaultValue={settings.company || ""}
                disabled={!editable}
                required
                placeholder="e.g. Acme Corporation"
              />
            </div>
            <div className="org-input-group">
              <label htmlFor="office-start">Office start time</label>
              <input
                id="office-start"
                name="officeStart"
                type="time"
                defaultValue={settings.officeStart || "09:00"}
                disabled={!editable}
                required
              />
            </div>
            <div className="org-input-group">
              <label htmlFor="office-end">Office end time</label>
              <input
                id="office-end"
                name="officeEnd"
                type="time"
                defaultValue={settings.officeEnd || "17:00"}
                disabled={!editable}
                required
              />
            </div>
          </div>

          <div className="org-form-row">
            <div className="org-input-group">
              <label htmlFor="grace-minutes">Grace period (minutes)</label>
              <input
                id="grace-minutes"
                name="graceMinutes"
                type="number"
                min="0"
                max="180"
                defaultValue={settings.graceMinutes ?? 15}
                disabled={!editable}
                required
              />
            </div>
            <div className="org-input-group">
              <label htmlFor="half-day-hours">Half-day threshold (working hours)</label>
              <input
                id="half-day-hours"
                name="halfDayHours"
                type="number"
                min="1"
                max="12"
                step="0.5"
                defaultValue={settings.halfDayHours ?? 5}
                disabled={!editable}
                required
              />
            </div>
          </div>

          {/* Weekend Selector */}
          <div className="weekend-group">
            <div className="weekend-group-title">Weekly weekend days</div>
            <div className="weekend-group-desc">
              Select non-working days for your team schedule.
            </div>
            <div className="weekend-chips-grid">
              {WEEKDAYS.map((day) => {
                const isSelected = selectedWeekends.includes(day.index);
                return (
                  <button
                    key={day.index}
                    type="button"
                    className={`weekend-chip ${isSelected ? "active" : ""}`}
                    onClick={() => toggleWeekend(day.index)}
                    disabled={!editable}
                  >
                    <span>{day.label}</span>
                    {isSelected && <span className="chip-check">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Location & Geofence */}
          <div className="org-section-title">
            <span>📍</span> Office Geofencing & Location
          </div>
          <div className="org-form-row">
            <div className="org-input-group">
              <label htmlFor="office-lat">Office latitude</label>
              <input
                id="office-lat"
                name="officeLatitude"
                type="number"
                min="-90"
                max="90"
                step="any"
                defaultValue={settings.officeLatitude ?? ""}
                disabled={!editable}
                placeholder="e.g. 31.5204"
              />
            </div>
            <div className="org-input-group">
              <label htmlFor="office-long">Office longitude</label>
              <input
                id="office-long"
                name="officeLongitude"
                type="number"
                min="-180"
                max="180"
                step="any"
                defaultValue={settings.officeLongitude ?? ""}
                disabled={!editable}
                placeholder="e.g. 74.3587"
              />
            </div>
            <div className="org-input-group">
              <label htmlFor="office-radius">Check-in radius (meters)</label>
              <input
                id="office-radius"
                name="officeRadiusMeters"
                type="number"
                min="10"
                max="10000"
                defaultValue={settings.officeRadiusMeters || 150}
                disabled={!editable}
                placeholder="150"
              />
            </div>
          </div>

          {editable && (
            <div className="org-rules-footer">
              <button className="button primary" disabled={savingRules}>
                {savingRules ? "Saving…" : "Save organization rules"}
              </button>
            </div>
          )}
        </form>
      )}

      {/* 2. Departments & Designations Grid */}
      {(activeTab === "all" || activeTab === "structure") && (
        <div className="setup-grid">
          {/* Departments Card */}
          <section className="setup-card">
            <div className="setup-card-header">
              <div>
                <h3>Departments</h3>
                <p>Team divisions and business units</p>
              </div>
              <span className="setup-badge-count">
                {departments.length} configured
              </span>
            </div>

            {canManageStructure && (
              <div className="setup-add-box">
                <form
                  className="setup-add-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const form = new FormData(e.currentTarget);
                    addRecord(
                      "/departments",
                      {
                        name: form.get("name"),
                        description: form.get("description") || "",
                      },
                      "Department added successfully.",
                    );
                    e.currentTarget.reset();
                  }}
                >
                  <div className="setup-form-row">
                    <input
                      name="name"
                      required
                      placeholder="Department name (e.g. Engineering)"
                      className="setup-add-input"
                    />
                    <button className="button primary" style={{ height: 38 }}>
                      + Add
                    </button>
                  </div>
                </form>
              </div>
            )}

            {departments.length > 0 ? (
              <div className="dept-chips-container">
                {departments.map((dept) => {
                  const roleCount = designations.filter(
                    (d) => d.department === dept.name,
                  ).length;
                  return (
                    <div
                      className="dept-chip-item"
                      key={dept.id || dept._id}
                    >
                      <span className="dept-icon">🏢</span>
                      <span>{dept.name}</span>
                      {roleCount > 0 && (
                        <span className="dept-pill-tag">
                          {roleCount} {roleCount === 1 ? "role" : "roles"}
                        </span>
                      )}
                      {canManageStructure && (
                        <button
                          type="button"
                          className="remove-btn"
                          aria-label={`Remove ${dept.name}`}
                          onClick={() =>
                            removeRecord(
                              `/departments/${dept.id || dept._id}`,
                              "department",
                            )
                          }
                          title="Remove department"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="setup-empty-box">
                <span className="setup-empty-icon">🏢</span>
                <b>No departments yet</b>
                <small>Create your organization’s first department above.</small>
              </div>
            )}
          </section>

          {/* Designations Card */}
          <section className="setup-card">
            <div className="setup-card-header">
              <div>
                <h3>Designations & Roles</h3>
                <p>Employee job titles and departmental hierarchy</p>
              </div>
              <span className="setup-badge-count">
                {designations.length} configured
              </span>
            </div>

            {canManageStructure && (
              <div className="setup-add-box">
                <form
                  className="setup-add-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const form = new FormData(e.currentTarget);
                    addRecord(
                      "/designations",
                      {
                        name: form.get("name"),
                        department: form.get("department") || "",
                      },
                      "Designation added successfully.",
                    );
                    e.currentTarget.reset();
                  }}
                >
                  <div className="setup-form-row">
                    <input
                      name="name"
                      required
                      placeholder="Role title (e.g. Senior Designer)"
                      className="setup-add-input"
                    />
                    <select
                      name="department"
                      className="setup-add-select"
                      defaultValue=""
                    >
                      <option value="">All departments</option>
                      {departments.map((dept) => (
                        <option key={dept.id || dept._id} value={dept.name}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                    <button className="button primary" style={{ height: 38 }}>
                      + Add
                    </button>
                  </div>
                </form>
              </div>
            )}

            {designations.length > 0 ? (
              <div className="setup-items-list">
                {designations.map((item) => (
                  <div
                    className="setup-row-item"
                    key={item.id || item._id}
                  >
                    <div className="setup-row-main">
                      <span>💼</span>
                      <div className="setup-row-info">
                        <b>{item.name}</b>
                        <small>
                          {item.department ? (
                            <span className="dept-pill-tag">
                              {item.department}
                            </span>
                          ) : (
                            "General role"
                          )}
                        </small>
                      </div>
                    </div>
                    {canManageStructure && (
                      <button
                        type="button"
                        className="setup-del-btn"
                        aria-label={`Remove ${item.name}`}
                        onClick={() =>
                          removeRecord(
                            `/designations/${item.id || item._id}`,
                            "designation",
                          )
                        }
                        title="Remove designation"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="setup-empty-box">
                <span className="setup-empty-icon">💼</span>
                <b>No designations yet</b>
                <small>Add company job titles to assign to team members.</small>
              </div>
            )}
          </section>
        </div>
      )}

      {/* 3. Leave Types & Holidays Grid */}
      {(activeTab === "all" || activeTab === "timeoff") && (
        <div className="setup-grid">
          {/* Leave Types & Quotas Card */}
          <section className="setup-card">
            <div className="setup-card-header">
              <div>
                <h3>Leave Types & Quotas</h3>
                <p>Annual time-off allowances and paid status</p>
              </div>
              <span className="setup-badge-count">
                {leaveTypes.length} types
              </span>
            </div>

            {editable && (
              <div className="setup-add-box">
                <form
                  className="setup-add-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const form = new FormData(e.currentTarget);
                    addRecord(
                      "/leave-types",
                      {
                        name: form.get("name"),
                        quota: Number(form.get("quota") || 0),
                        paid: form.get("paid") === "on",
                      },
                      "Leave type added successfully.",
                    );
                    e.currentTarget.reset();
                  }}
                >
                  <div className="setup-form-row">
                    <input
                      name="name"
                      required
                      placeholder="Leave type (e.g. Annual)"
                      className="setup-add-input"
                    />
                    <input
                      name="quota"
                      type="number"
                      min="0"
                      defaultValue="14"
                      required
                      placeholder="Quota"
                      title="Annual quota (days)"
                      style={{ width: 85 }}
                      className="setup-add-input"
                    />
                    <label className="setup-checkbox-pill">
                      <input
                        type="checkbox"
                        name="paid"
                        defaultChecked
                      />
                      <span>Paid leave</span>
                    </label>
                    <button className="button primary" style={{ height: 38 }}>
                      + Add
                    </button>
                  </div>
                </form>
              </div>
            )}

            {leaveTypes.length > 0 ? (
              <div className="setup-items-list">
                {leaveTypes.map((item) => (
                  <div
                    className="setup-row-item"
                    key={item.id || item._id}
                  >
                    <div className="setup-row-main">
                      <span>🏖</span>
                      <div className="setup-row-info">
                        <b>{item.name}</b>
                        <small>
                          {item.quota === 0 ? "Unlimited days" : `${item.quota} days/year`} ·{" "}
                          <span
                            className={`paid-pill-tag ${item.paid ? "paid" : "unpaid"}`}
                          >
                            {item.paid ? "Paid" : "Unpaid"}
                          </span>
                        </small>
                      </div>
                    </div>

                    <div className="setup-row-actions">
                      {editable && (
                        <form
                          className="leave-quota-form"
                          onSubmit={(e) => {
                            e.preventDefault();
                            updateLeaveType(item, new FormData(e.currentTarget));
                          }}
                        >
                          <input
                            aria-label={`${item.name} quota`}
                            name="quota"
                            type="number"
                            min="0"
                            defaultValue={item.quota}
                            className="leave-quota-input"
                            title="Edit annual quota"
                          />
                          <label className="leave-paid-label">
                            <input
                              name="paid"
                              type="checkbox"
                              defaultChecked={item.paid}
                            />
                            Paid
                          </label>
                          <button className="leave-save-btn" type="submit">
                            Save
                          </button>
                        </form>
                      )}
                      {editable && (
                        <button
                          type="button"
                          className="setup-del-btn"
                          aria-label={`Remove ${item.name}`}
                          onClick={() =>
                            removeRecord(
                              `/leave-types/${item.id || item._id}`,
                              "leave type",
                            )
                          }
                          title="Remove leave type"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="setup-empty-box">
                <span className="setup-empty-icon">🏖</span>
                <b>No leave types configured</b>
                <small>Define time-off policies (e.g. Casual, Sick, Annual).</small>
              </div>
            )}
          </section>

          {/* Public Holidays Card */}
          <section className="setup-card">
            <div className="setup-card-header">
              <div>
                <h3>Public Holidays</h3>
                <p>Non-working company holidays and observational days</p>
              </div>
              <span className="setup-badge-count">
                {holidays.length} holidays
              </span>
            </div>

            {editable && (
              <div className="setup-add-box">
                <form
                  className="setup-add-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const form = new FormData(e.currentTarget);
                    addRecord(
                      "/holidays",
                      {
                        name: form.get("name"),
                        date: form.get("date"),
                      },
                      "Holiday added successfully.",
                    );
                    e.currentTarget.reset();
                  }}
                >
                  <div className="setup-form-row">
                    <input
                      name="name"
                      required
                      placeholder="Holiday name (e.g. New Year's Day)"
                      className="setup-add-input"
                    />
                    <input
                      name="date"
                      type="date"
                      required
                      className="setup-add-input"
                      style={{ maxWidth: 170 }}
                    />
                    <button className="button primary" style={{ height: 38 }}>
                      + Add
                    </button>
                  </div>
                </form>
              </div>
            )}

            {holidays.length > 0 ? (
              <div className="setup-items-list">
                {holidays.map((item) => {
                  const dateObj = new Date(`${item.date}T12:00:00`);
                  const monthName = dateObj.toLocaleDateString("en-US", {
                    month: "short",
                  });
                  const dayNum = dateObj.getDate();
                  const fullDateStr = dateObj.toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  });

                  return (
                    <div
                      className="setup-row-item"
                      key={item.id || item._id}
                    >
                      <div className="setup-row-main">
                        <div className="holiday-date-badge">
                          <span className="holiday-date-month">{monthName}</span>
                          <span className="holiday-date-day">{dayNum}</span>
                        </div>
                        <div className="setup-row-info">
                          <b>{item.name}</b>
                          <small>{fullDateStr}</small>
                        </div>
                      </div>
                      {editable && (
                        <button
                          type="button"
                          className="setup-del-btn"
                          aria-label={`Remove ${item.name}`}
                          onClick={() =>
                            removeRecord(
                              `/holidays/${item.id || item._id}`,
                              "holiday",
                            )
                          }
                          title="Remove holiday"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="setup-empty-box">
                <span className="setup-empty-icon">📅</span>
                <b>No holidays added yet</b>
                <small>Add public holidays so attendance and payroll reflect them.</small>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
