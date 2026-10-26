"use client";

import { useEffect, useState } from "react";
import { api, downloadFile } from "@/lib/api";
import { Role } from "@/lib/types";

interface PayrollViewProps {
  token: string;
  role: Role;
}

export default function PayrollView({ token, role }: PayrollViewProps) {
  const [runs, setRuns] = useState<any[]>([]);
  const [slips, setSlips] = useState<any[]>([]);
  const [month, setMonth] = useState(
    new Date().toLocaleDateString("en-CA").slice(0, 7),
  );
  const [selectedMonth, setSelectedMonth] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmFinalizeRun, setConfirmFinalizeRun] = useState<any | null>(null);

  async function load() {
    if (role === "employee") {
      setSlips(await api<any[]>("/payslips", { token }));
      return;
    }
    const payrollRuns = await api<any[]>("/payroll/runs", { token });
    setRuns(payrollRuns);
    if (selectedMonth) {
      setSlips(
        await api<any[]>(
          `/payslips?month=${encodeURIComponent(selectedMonth)}`,
          { token },
        ),
      );
    } else {
      setSlips([]);
    }
  }

  useEffect(() => {
    load().catch((requestError) => setError(requestError.message));
  }, [token, role, selectedMonth]);

  async function runPayroll() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const run = await api<any>("/payroll/runs", {
        token,
        method: "POST",
        body: JSON.stringify({ month }),
      });
      setSelectedMonth(month);
      setNotice(`Draft prepared for ${run.payslipCount} employees.`);
      await load();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not create the payroll draft.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function finalizeRun(id: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const run = runs.find((r) => r.id === id || r.month === id);
      const targetId = (!id || id === "[object Object]") ? (run?.month || id) : id;
      await api(`/payroll/runs/${encodeURIComponent(targetId)}/finalize`, {
        token,
        method: "POST",
        body: "{}",
      });
      setConfirmFinalizeRun(null);
      setNotice(
        `Payroll for ${run?.month || "this month"} has been successfully finalized and locked. Employee payslips are now available.`,
      );
      await load();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not finalize the payroll run.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function downloadPayslip(slip: any) {
    try {
      await downloadFile(
        `/payslips/${slip.id}/pdf`,
        token,
        `payslip-${slip.month}.pdf`,
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not download the payslip.",
      );
    }
  }

  const selectedRun = runs.find((r) => r.month === selectedMonth);

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

      {role !== "employee" && (
        <section className="panel full-panel">
          <div className="panel-heading">
            <div>
              <h3>Monthly payroll</h3>
              <p>
                {role === "admin"
                  ? "Review calculated drafts and finalize monthly payroll runs to lock and release payslips."
                  : "Prepare payroll from attendance, approved leave, and employee salary records."}
              </p>
            </div>
          </div>
          <div className="payroll-run-controls">
            <label>
              Payroll month
              <input
                type="month"
                value={month}
                onChange={(event) => setMonth(event.target.value)}
              />
            </label>
            {(role === "hr" || role === "admin") && (
              <button
                className="button primary"
                disabled={busy}
                onClick={runPayroll}
              >
                {busy ? "Preparing…" : "Create or refresh draft"}
              </button>
            )}
          </div>
          <p className="muted">
            Gross is basic salary × 1.5 plus additional allowances. Monthly tax
            uses the illustrative annual slabs. Finalized runs are permanently locked against changes.
          </p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>MONTH</th>
                  <th>STATUS</th>
                  <th>EMPLOYEES</th>
                  <th>GROSS COST</th>
                  <th>NET PAY</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id}>
                    <td>
                      <strong>{run.month}</strong>
                    </td>
                    <td>
                      <span
                        className={`badge ${run.status === "finalized" ? "approved" : "pending"}`}
                      >
                        {run.status === "finalized" ? "✓ Finalized" : "Draft"}
                      </span>
                    </td>
                    <td>{run.payslipCount ?? "—"}</td>
                    <td>{money(run.totalGross)}</td>
                    <td>{money(run.totalNet)}</td>
                    <td>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="button secondary"
                          style={{
                            minHeight: "28px",
                            padding: "0 10px",
                            fontSize: "11px",
                          }}
                          onClick={() => setSelectedMonth(run.month)}
                        >
                          View payslips
                        </button>
                        {role === "admin" && run.status === "draft" && (
                          <button
                            type="button"
                            className="finalize-btn"
                            onClick={() => setConfirmFinalizeRun(run)}
                            disabled={busy}
                            title="Review and finalize this payroll"
                          >
                            🔒 Finalize
                          </button>
                        )}
                        {run.status === "finalized" && (
                          <span
                            className="finalized-tag"
                            title="Locked and published"
                          >
                            ✓ Locked
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {runs.length === 0 && <EmptyState text="No payroll runs yet" />}
          </div>
        </section>
      )}

      <section className="panel full-panel section-spacer">
        <div className="panel-heading">
          <div>
            <h3>
              {role === "employee"
                ? "My payslips"
                : `Payslips ${selectedMonth ? `· ${selectedMonth}` : ""}`}
            </h3>
            <p>
              {role === "admin"
                ? "Review individual payslips below. PDFs become downloadable once finalized."
                : "PDF payslips appear after Admin finalizes the month."}
            </p>
          </div>
          {role !== "employee" && (
            <select
              className="select-button"
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
            >
              <option value="">Select a payroll month</option>
              {runs.map((run) => (
                <option key={run.id} value={run.month}>
                  {run.month} ({run.status})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Dedicated Admin Finalize Callout Banner */}
        {role === "admin" && selectedRun && selectedRun.status === "draft" && (
          <div className="admin-finalize-banner">
            <div className="finalize-banner-info">
              <span className="finalize-banner-badge">
                ADMIN ACTION REQUIRED
              </span>
              <h4>Draft Payroll Ready for Finalization · {selectedRun.month}</h4>
              <p>
                Calculations for <strong>{selectedRun.month}</strong> cover{" "}
                <strong>
                  {selectedRun.payslipCount ?? slips.length} employees
                </strong>{" "}
                with a total gross cost of{" "}
                <strong>{money(selectedRun.totalGross)}</strong> and net
                disbursement of <strong>{money(selectedRun.totalNet)}</strong>.
                Review the breakdown below and finalize to release payslips to
                staff.
              </p>
            </div>
            <button
              type="button"
              className="button primary finalize-banner-btn"
              onClick={() => setConfirmFinalizeRun(selectedRun)}
              disabled={busy}
            >
              🔒 Finalize {selectedRun.month} Payroll
            </button>
          </div>
        )}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>MONTH</th>
                {role !== "employee" && <th>EMPLOYEE</th>}
                <th>GROSS</th>
                <th>DEDUCTIONS</th>
                <th>TAX</th>
                <th>NET PAY</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {slips.map((slip) => (
                <tr key={slip.id}>
                  <td>{slip.month}</td>
                  {role !== "employee" && (
                    <td>
                      {slip.employeeName}
                      <small>
                        {slip.employeeCode} · {slip.department}
                      </small>
                    </td>
                  )}
                  <td>{money(slip.gross)}</td>
                  <td>
                    {money(
                      slip.absentDeduction +
                        slip.unpaidDeduction +
                        slip.halfDayDeduction,
                    )}
                  </td>
                  <td>{money(slip.tax)}</td>
                  <td>{money(slip.net)}</td>
                  <td>
                    {role === "employee" && !slip.finalized ? (
                      <span className="badge pending">Not finalized</span>
                    ) : (
                      <button
                        className="button secondary small-button"
                        onClick={() => downloadPayslip(slip)}
                        disabled={!slip.finalized && role === "employee"}
                      >
                        Download PDF
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {slips.length === 0 && <EmptyState text="No payslips available" />}
        </div>
      </section>

      {/* Admin Finalize Confirmation Dialog */}
      {confirmFinalizeRun && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) =>
            e.target === e.currentTarget && !busy && setConfirmFinalizeRun(null)
          }
        >
          <section className="modal" role="dialog" aria-modal="true">
            <div className="modal-head">
              <div>
                <div className="eyebrow">ADMINISTRATIVE ACTION</div>
                <h2>Finalize Payroll · {confirmFinalizeRun.month}</h2>
                <p>
                  Review summary and permanently lock the payroll run for{" "}
                  {confirmFinalizeRun.month}.
                </p>
              </div>
              <button
                type="button"
                className="close-btn"
                onClick={() => setConfirmFinalizeRun(null)}
                disabled={busy}
              >
                ×
              </button>
            </div>

            <div className="finalize-stats-grid">
              <div className="finalize-stat-card">
                <span className="finalize-stat-label">Employees Included</span>
                <strong className="finalize-stat-val">
                  {confirmFinalizeRun.payslipCount ?? "—"} staff
                </strong>
              </div>
              <div className="finalize-stat-card">
                <span className="finalize-stat-label">Total Company Gross</span>
                <strong className="finalize-stat-val">
                  {money(confirmFinalizeRun.totalGross)}
                </strong>
              </div>
              <div className="finalize-stat-card">
                <span className="finalize-stat-label">
                  Total Net Disbursement
                </span>
                <strong className="finalize-stat-val highlight">
                  {money(confirmFinalizeRun.totalNet)}
                </strong>
              </div>
            </div>

            <div className="finalize-warning-box">
              <span className="warning-icon" aria-hidden="true">
                ⚠️
              </span>
              <div>
                <b>Lock Notice & Audit Enforcement:</b>
                <p>
                  Finalizing will lock this payroll month permanently.
                  Calculations cannot be modified afterward. Employees will
                  immediately be notified and can download their official
                  payslips.
                </p>
              </div>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="button secondary"
                onClick={() => setConfirmFinalizeRun(null)}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                type="button"
                className="button primary finalize-confirm-btn"
                onClick={() =>
                  finalizeRun(
                    confirmFinalizeRun.id &&
                      confirmFinalizeRun.id !== "[object Object]"
                      ? confirmFinalizeRun.id
                      : confirmFinalizeRun.month,
                  )
                }
                disabled={busy}
              >
                {busy
                  ? "Finalizing & locking…"
                  : `Lock & Finalize ${confirmFinalizeRun.month}`}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

function money(value: number) {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="empty-state">
      <span>＄</span>
      <b>{text}</b>
      <small>Completed payroll will appear here.</small>
    </div>
  );
}
