"use client";

import { FormEvent, useEffect, useState } from "react";
import { api, jsonBody } from "@/lib/api";
import { LeaveRequest, Role } from "@/lib/types";

interface LeaveViewProps {
  token: string;
  role: Role;
}

export default function LeaveView({ token, role }: LeaveViewProps) {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [balances, setBalances] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [naturalText, setNaturalText] = useState("");
  const [prefill, setPrefill] = useState<any>(null);
  const [formValues, setFormValues] = useState({
    type: "casual",
    startDate: "",
    endDate: "",
    reason: "",
  });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const [leaveRequests, leaveTypes] = await Promise.all([
      api<LeaveRequest[]>("/leaves", { token }),
      api<any[]>("/leave-types", { token }),
    ]);
    setRequests(leaveRequests);
    setTypes(leaveTypes);
    if (role === "employee") {
      const result = await api<{ balances: any[] }>("/leaves/balance", {
        token,
      });
      setBalances(result.balances);
    }
  }

  useEffect(() => {
    load().catch((requestError) => setError(requestError.message));
  }, [token, role]);

  async function prepareSmartLeave() {
    if (!naturalText.trim()) return;
    setBusy(true);
    setError("");
    try {
      const result = await api<any>("/ai/smart-leave", {
        token,
        method: "POST",
        body: jsonBody({ message: naturalText }),
      });
      if (result.prefilled) {
        setPrefill(result.leave);
        setFormValues({
          type: result.leave.type,
          startDate: result.leave.startDate,
          endDate: result.leave.endDate,
          reason: result.leave.reason,
        });
        setNotice(
          "AI filled the form. Review the dates and details before submitting.",
        );
      } else {
        const values = {
          type: types[0]?.name || "casual",
          startDate: "",
          endDate: "",
          reason: naturalText,
        };
        setPrefill(values);
        setFormValues(values);
        setNotice(result.message || "Review and complete the leave form.");
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not prepare the leave form.",
      );
      const values = {
        type: types[0]?.name || "casual",
        startDate: "",
        endDate: "",
        reason: naturalText,
      };
      setPrefill(values);
      setFormValues(values);
    } finally {
      setBusy(false);
    }
  }

  async function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      await api("/leaves", {
        token,
        method: "POST",
        body: jsonBody({
          type: form.get("type"),
          startDate: form.get("startDate"),
          endDate: form.get("endDate"),
          reason: form.get("reason"),
        }),
      });
      setOpen(false);
      setPrefill(null);
      setFormValues({ type: "casual", startDate: "", endDate: "", reason: "" });
      setNaturalText("");
      setNotice("Your leave request was sent to HR.");
      await load();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not submit the leave request.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function review(id: string, status: "approved" | "rejected") {
    const comment = window.prompt(
      status === "approved"
        ? "Optional approval comment:"
        : "Reason for rejecting this leave request:",
    );
    if (comment === null) return;
    const finalComment =
      comment.trim() || (status === "approved" ? "Approved" : "Rejected");
    setError("");
    try {
      await api(`/leaves/${id}/review`, {
        token,
        method: "PATCH",
        body: jsonBody({ status, comment: finalComment }),
      });
      setNotice(`Leave request ${status}.`);
      await load();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not review the request.",
      );
    }
  }

  async function cancel(id: string) {
    if (!window.confirm("Cancel this leave request?")) return;
    try {
      await api(`/leaves/${id}/cancel`, {
        token,
        method: "POST",
        body: jsonBody({}),
      });
      setNotice("Leave request cancelled.");
      await load();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not cancel the request.",
      );
    }
  }

  return (
    <>
      {error && (
        <div className="alert error" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="alert success" role="status">
          {notice}
          <button onClick={() => setNotice("")}>×</button>
        </div>
      )}

      {role === "employee" && (
        <section className="panel full-panel leave-balances">
          <div className="panel-heading">
            <div>
              <h3>My leave balance</h3>
              <p>Approved working days used this year.</p>
            </div>
            <button
              className="button primary"
              onClick={() => {
                setFormValues({
                  type: types[0]?.name || "casual",
                  startDate: "",
                  endDate: "",
                  reason: "",
                });
                setNaturalText("");
                setPrefill(null);
                setOpen(true);
              }}
            >
              ＋ Request leave
            </button>
          </div>
          <div className="stats-grid">
            {balances.map((balance) => (
              <article className="panel stat-card" key={balance.type}>
                <div className="stat-top">
                  <span className="capitalize">{balance.type} leave</span>
                  <span className="stat-icon purple">▤</span>
                </div>
                <strong>
                  {balance.remaining === null
                    ? "Unlimited"
                    : `${balance.remaining} days`}
                </strong>
                <small>
                  {balance.used} used of {balance.quota || "unlimited"}
                </small>
              </article>
            ))}
          </div>
          {!balances.length && (
            <EmptyState text="No leave types have been configured" />
          )}
        </section>
      )}

      <section className="panel full-panel section-spacer">
        <div className="panel-heading">
          <div>
            <h3>
              {role === "employee"
                ? "My leave requests"
                : "Leave approval inbox"}
            </h3>
            <p>
              {role === "employee"
                ? "Review your leave history and current request status."
                : "Approve or reject employee requests with a comment."}
            </p>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {role !== "employee" && <th>EMPLOYEE</th>}
                <th>TYPE</th>
                <th>DATES</th>
                <th>DAYS</th>
                <th>REASON</th>
                <th>STATUS</th>
                {role !== "employee" && <th>ACTION</th>}
                {role === "employee" && <th>ACTION</th>}
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request.id}>
                  {role !== "employee" && (
                    <td>
                      {request.name}
                      <small>{request.department}</small>
                    </td>
                  )}
                  <td className="capitalize">{request.type}</td>
                  <td>
                    {formatDate(request.startDate || request.start_date || "")}{" "}
                    – {formatDate(request.endDate || request.end_date || "")}
                  </td>
                  <td>{request.days}</td>
                  <td>{request.reason}</td>
                  <td>
                    <span className={`badge ${request.status}`}>
                      {request.status}
                    </span>
                    {request.comment && <small>{request.comment}</small>}
                  </td>
                  <td>
                    {(role === "hr" || role === "admin") && request.status === "pending" ? (
                      <div className="row-actions">
                        <button onClick={() => review(request.id, "approved")}>
                          Approve
                        </button>
                        <button onClick={() => review(request.id, "rejected")}>
                          Reject
                        </button>
                      </div>
                    ) : role === "employee" &&
                      ["pending", "approved"].includes(request.status) ? (
                      <button
                        className="button secondary small-button"
                        onClick={() => cancel(request.id)}
                      >
                        Cancel
                      </button>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {requests.length === 0 && <EmptyState text="No leave requests yet" />}
        </div>
      </section>

      {open && (
        <div className="modal-backdrop">
          <form className="modal" onSubmit={submitRequest}>
            <div className="modal-head">
              <div>
                <div className="eyebrow">TIME AWAY</div>
                <h2>Request leave</h2>
                <p>AI can prefill the form; you review and submit it.</p>
              </div>
              <button
                className="close-btn"
                type="button"
                onClick={() => {
                  setOpen(false);
                  setPrefill(null);
                }}
              >
                ×
              </button>
            </div>
            <label>
              Describe your leave in plain language
              <textarea
                rows={2}
                value={naturalText}
                onChange={(event) => setNaturalText(event.target.value)}
                placeholder="I need next Monday and Tuesday off for a wedding"
              />
            </label>
            <button
              type="button"
              className="button secondary"
              onClick={prepareSmartLeave}
              disabled={busy || !naturalText.trim()}
            >
              {busy ? "Preparing…" : "Prefill with AI"}
            </button>
            {notice && <div className="alert success">{notice}</div>}
            <label>
              Leave type
              <select
                name="type"
                value={formValues.type}
                onChange={(event) =>
                  setFormValues({ ...formValues, type: event.target.value })
                }
              >
                {types.map((type) => (
                  <option key={type.id || type.name} value={type.name}>
                    {type.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="form-grid">
              <label>
                Start date
                <input
                  name="startDate"
                  type="date"
                  value={formValues.startDate}
                  onChange={(event) =>
                    setFormValues({
                      ...formValues,
                      startDate: event.target.value,
                    })
                  }
                  required
                />
              </label>
              <label>
                End date
                <input
                  name="endDate"
                  type="date"
                  value={formValues.endDate}
                  onChange={(event) =>
                    setFormValues({
                      ...formValues,
                      endDate: event.target.value,
                    })
                  }
                  required
                />
              </label>
            </div>
            <label>
              Reason
              <textarea
                name="reason"
                rows={3}
                value={formValues.reason}
                onChange={(event) =>
                  setFormValues({ ...formValues, reason: event.target.value })
                }
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
              <button className="button primary" disabled={busy}>
                Review and submit
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

function formatDate(value: string) {
  if (!value) return "—";
  return new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString(
    "en-PK",
    { day: "numeric", month: "short", year: "numeric" },
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="empty-state">
      <span>▤</span>
      <b>{text}</b>
      <small>Leave activity will show here.</small>
    </div>
  );
}
