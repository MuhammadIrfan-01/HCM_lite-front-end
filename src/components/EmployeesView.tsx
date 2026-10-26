"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { api, downloadFile, jsonBody } from "@/lib/api";
import { Employee, Role } from "@/lib/types";

interface EmployeesViewProps {
  token: string;
  role: Role;
}

interface ImportRowError {
  row: number;
  errors: { field: string; reason: string }[];
}

export default function EmployeesView({ token, role }: EmployeesViewProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [profileEmployee, setProfileEmployee] = useState<Employee | null>(null);
  const [newEmployeeAccount, setNewEmployeeAccount] = useState<{
    name: string;
    email: string;
    code: string;
    companyName: string;
    createdByName: string;
    password: string;
  } | null>(null);
  const [importCredentials, setImportCredentials] = useState<
    { name: string; email: string; code: string; password: string }[]
  >([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [csv, setCsv] = useState("");
  const [csvName, setCsvName] = useState("");
  const [dryRunRows, setDryRunRows] = useState<ImportRowError[]>([]);
  const [validRows, setValidRows] = useState(0);
  const [importOpen, setImportOpen] = useState(false);
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [deptName, setDeptName] = useState("");
  const [deptDesc, setDeptDesc] = useState("");
  const [deptBusy, setDeptBusy] = useState(false);
  const [deptError, setDeptError] = useState("");
  const [successNotice, setSuccessNotice] = useState("");

  async function loadDepartments() {
    try {
      const items = await api<any[]>("/departments", { token });
      setDepartments(items.map((item) => item.name));
    } catch {
      setDepartments([]);
    }
  }

  async function saveDepartment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = deptName.trim();
    if (!trimmed) return;
    setDeptBusy(true);
    setDeptError("");
    try {
      await api("/departments", {
        token,
        method: "POST",
        body: jsonBody({
          name: trimmed,
          description: deptDesc.trim(),
        }),
      });
      const createdName = trimmed.toLowerCase();
      setDeptName("");
      setDeptDesc("");
      setShowDeptModal(false);
      setSuccessNotice(`Department "${createdName}" added successfully.`);
      await loadDepartments();
    } catch (requestError) {
      setDeptError(
        requestError instanceof Error
          ? requestError.message
          : "Could not add department.",
      );
    } finally {
      setDeptBusy(false);
    }
  }

  async function loadEmployees() {
    if (role === "employee") {
      const own = await api<Employee>("/employees/me", { token });
      setEmployees(own?.id ? [own] : []);
      setTotal(own?.id ? 1 : 0);
      return;
    }
    const params = new URLSearchParams({ page: String(page), limit: "25" });
    if (query.trim()) params.set("q", query.trim());
    if (department) params.set("department", department);
    const response = await api<{ items: Employee[]; total: number }>(
      `/employees?${params}`,
      { token },
    );
    setEmployees(response.items);
    setTotal(response.total);
  }

  useEffect(() => {
    loadEmployees().catch((requestError) => setError(requestError.message));
  }, [token, role, page, query, department]);

  useEffect(() => {
    loadDepartments();
  }, [token]);

  async function saveEmployee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const result = await api<{
        employee?: Employee;
        temporaryPassword?: string;
      }>(editing ? "/employees/" + editing.id : "/employees", {
        token,
        method: editing ? "PUT" : "POST",
        body: jsonBody({
          code: form.get("code"),
          name: form.get("name"),
          email: form.get("email"),
          department: form.get("department"),
          designation: form.get("designation"),
          joiningDate: form.get("joiningDate"),
          basicSalary: Number(form.get("basicSalary")),
          allowances: Number(form.get("allowances") || 0),
          phone: form.get("phone"),
          address: form.get("address"),
          gender: form.get("gender"),
        }),
      });
      setShowForm(false);
      setEditing(null);
      if (result.employee && result.temporaryPassword) {
        setNewEmployeeAccount({
          name: result.employee.name,
          email: result.employee.email,
          code: result.employee.code,
          companyName: result.employee.companyName || "",
          createdByName: result.employee.createdByName || "",
          password: result.temporaryPassword,
        });
      }
      await loadEmployees();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not save the employee.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function readCsv(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setCsvName(file.name);
    setCsv(await file.text());
    setDryRunRows([]);
    setImportOpen(true);
  }

  async function runDryCheck() {
    setBusy(true);
    setError("");
    try {
      const result = await api<{ validRows: number; rows: ImportRowError[] }>(
        "/employees/import/dry-run",
        {
          token,
          method: "POST",
          body: jsonBody({ csv }),
        },
      );
      setValidRows(result.validRows);
      setDryRunRows(result.rows.filter((row) => row.errors.length));
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not validate the CSV file.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function importCsv() {
    setBusy(true);
    setError("");
    try {
      const result = await api<{
        created: { employee: Employee; temporaryPassword: string }[];
      }>("/employees/import", {
        token,
        method: "POST",
        body: jsonBody({ csv }),
      });
      setImportOpen(false);
      setImportCredentials(
        result.created.map(({ employee, temporaryPassword: password }) => ({
          name: employee.name,
          email: employee.email,
          code: employee.code,
          password,
        })),
      );
      await loadEmployees();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not import employees.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function setEmployeeLoginActive(employee: Employee, active: boolean) {
    if (!employee.loginUserId) return;
    try {
      await api(`/users/${employee.loginUserId}/active`, {
        token,
        method: "PATCH",
        body: jsonBody({ active }),
      });
      await loadEmployees();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not update login access.",
      );
    }
  }

  async function resetEmployeeLogin(employee: Employee) {
    try {
      const result = await api<{ temporaryPassword: string }>(
        `/employees/${employee.id}/reset-password`,
        { token, method: "POST", body: "{}" },
      );
      setNewEmployeeAccount({
        name: employee.name,
        email: employee.email,
        code: employee.code,
        companyName: employee.companyName || "",
        createdByName: employee.createdByName || "",
        password: result.temporaryPassword,
      });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not reset this login.",
      );
    }
  }

  return (
    <>
      <section className="panel full-panel">
        <div className="toolbar">
          <div className="searchbox">
            <span>⌕</span>
            <input
              value={query}
              onChange={(event) => {
                setPage(1);
                setQuery(event.target.value);
              }}
              placeholder="Search by name, code, email, or department"
            />
          </div>
          <select
            className="select-button"
            value={department}
            onChange={(event) => {
              setPage(1);
              setDepartment(event.target.value);
            }}
          >
            <option value="">All departments</option>
            {departments.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          {(role === "hr" || role === "admin") && (
            <button
              type="button"
              className="button secondary"
              onClick={() => {
                setDeptError("");
                setShowDeptModal(true);
              }}
              title="Add a new department"
            >
              ＋ Add department
            </button>
          )}
          {(role === "hr" || role === "admin") && (
            <>
              <label className="button secondary file-button">
                Import CSV
                <input type="file" accept=".csv,text/csv" onChange={readCsv} />
              </label>
              <button
                className="button secondary"
                onClick={() =>
                  downloadFile(
                    "/employees/export.csv",
                    token,
                    "hcm-employees.csv",
                  ).catch((downloadError) => setError(downloadError.message))
                }
              >
                Export CSV
              </button>
              <button
                className="button primary"
                onClick={() => setShowForm(true)}
              >
                ＋ Add employee
              </button>
            </>
          )}
        </div>
        {successNotice && (
          <div className="alert success" role="status">
            <span>{successNotice}</span>
            <button
              type="button"
              onClick={() => setSuccessNotice("")}
              style={{
                background: "none",
                border: 0,
                fontSize: "16px",
                cursor: "pointer",
                marginLeft: "auto",
                color: "inherit",
              }}
            >
              ×
            </button>
          </div>
        )}
        {error && (
          <div className="alert error" role="alert">
            {error}
          </div>
        )}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>EMPLOYEE</th>
                <th>DEPARTMENT</th>
                <th>DESIGNATION</th>
                <th>JOINED</th>
                {role !== "employee" && <th>BASIC SALARY</th>}
                <th>STATUS</th>
                {role === "admin" && <th>LOGIN ACCESS</th>}
                {role !== "employee" && <th>ACTION</th>}
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => (
                <tr key={employee.id}>
                  <td>
                    <div className="table-person">
                      <span className="person-avatar">
                        {initials(employee.name)}
                      </span>
                      <span>
                        <b>{employee.name}</b>
                        <small>
                          {employee.email} · {employee.code}
                        </small>
                        {(employee.companyName || employee.createdByName) && (
                          <small>
                            {employee.companyName || "Company"} · Added by{" "}
                            {employee.createdByName || "HR"}
                          </small>
                        )}
                      </span>
                    </div>
                  </td>
                  <td>{employee.department}</td>
                  <td>{employee.designation}</td>
                  <td>{formatDate(employee.joiningDate || "")}</td>
                  {role !== "employee" && (
                    <td>{formatMoney(employee.basicSalary || 0)}</td>
                  )}
                  <td>
                    <span
                      className={`badge ${employee.status === "active" ? "approved" : "pending"}`}
                    >
                      {employee.status}
                    </span>
                  </td>
                  {role === "admin" && (
                    <td>
                      <span
                        className={`badge ${employee.loginUserId && employee.loginActive ? "approved" : "rejected"}`}
                      >
                        {!employee.loginUserId
                          ? "Missing"
                          : employee.loginActive
                            ? "Active"
                            : "Inactive"}
                      </span>
                    </td>
                  )}
                  {role !== "employee" && (
                    <td>
                      <button
                        className="button secondary small-button"
                        onClick={() => setProfileEmployee(employee)}
                      >
                        View profile
                      </button>
                      {(role === "hr" || role === "admin") && (
                        <button
                          className="button secondary small-button"
                          onClick={() => setEditing(employee)}
                        >
                          Edit
                        </button>
                      )}
                      {role === "admin" && employee.loginUserId && (
                        <>
                          <button
                            className="button secondary small-button"
                            onClick={() => resetEmployeeLogin(employee)}
                          >
                            Reset login
                          </button>
                          <button
                            className="button secondary small-button"
                            onClick={() =>
                              setEmployeeLoginActive(
                                employee,
                                !employee.loginActive,
                              )
                            }
                          >
                            {employee.loginActive
                              ? "Deactivate login"
                              : "Activate login"}
                          </button>
                        </>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {!employees.length && (
            <EmptyState
              text={
                role === "employee"
                  ? "Your profile was not found"
                  : "No employees match these filters"
              }
            />
          )}
        </div>
        {role !== "employee" && (
          <div className="pagination">
            <span>
              {total
                ? `Showing ${(page - 1) * 25 + 1}–${Math.min(page * 25, total)} of ${total}`
                : "0 employees"}
            </span>
            <div>
              <button disabled={page <= 1} onClick={() => setPage(page - 1)}>
                Previous
              </button>
              <button
                disabled={page * 25 >= total}
                onClick={() => setPage(page + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>

      {showForm && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) =>
            event.target === event.currentTarget && setShowForm(false)
          }
        >
          <form className="modal wide" onSubmit={saveEmployee}>
            <div className="modal-head">
              <div>
                <div className="eyebrow">PEOPLE DIRECTORY</div>
                <h2>Add an employee</h2>
                <p>We’ll create their login with a temporary password.</p>
              </div>
              <button
                type="button"
                className="close-btn"
                onClick={() => setShowForm(false)}
              >
                ×
              </button>
            </div>
            {departments.length === 0 ? (
              <div
                className="alert error"
                role="alert"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>No departments created yet.</span>
                <button
                  type="button"
                  className="button secondary"
                  style={{ minHeight: "32px", padding: "0 12px", fontSize: "11.5px" }}
                  onClick={() => setShowDeptModal(true)}
                >
                  ＋ Add department
                </button>
              </div>
            ) : null}
            <div className="form-grid">
              <label>
                Full name
                <input name="name" required />
              </label>
              <label>
                Work email
                <input name="email" type="email" required />
              </label>
              <label>
                Employee code
                <input name="code" required />
              </label>
              <label>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span>Department</span>
                  <button
                    type="button"
                    onClick={() => setShowDeptModal(true)}
                    style={{
                      background: "none",
                      border: 0,
                      color: "var(--purple)",
                      cursor: "pointer",
                      fontSize: "11px",
                      fontWeight: 600,
                      padding: 0,
                    }}
                  >
                    ＋ Add new
                  </button>
                </div>
                <select name="department" required defaultValue="">
                  <option value="" disabled>
                    Select a department
                  </option>
                  {departments.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Designation
                <input name="designation" required />
              </label>
              <label>
                Joining date
                <input name="joiningDate" type="date" required />
              </label>
              <label>
                Basic monthly salary (PKR)
                <input name="basicSalary" type="number" min="1" required />
              </label>
              <label>
                Additional allowances (PKR)
                <input
                  name="allowances"
                  type="number"
                  min="0"
                  defaultValue="0"
                />
              </label>
              <label>
                Phone
                <input name="phone" />
              </label>
              <label>
                Address
                <input name="address" />
              </label>
              <label>
                Gender
                <select name="gender" defaultValue="">
                  <option value="">Prefer not to say</option>
                  <option>Female</option>
                  <option>Male</option>
                  <option>Other</option>
                </select>
              </label>
            </div>
            {error && <div className="alert error">{error}</div>}
            <div className="modal-actions">
              <button
                type="button"
                className="button secondary"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>
              <button
                className="button primary"
                disabled={busy || departments.length === 0}
              >
                {busy ? "Creating…" : "Create employee and login"}
              </button>
            </div>
          </form>
        </div>
      )}

      {editing && (
        <EmployeeEditDialog
          token={token}
          employee={editing}
          departments={departments}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await loadEmployees();
          }}
        />
      )}

      {profileEmployee && (
        <Employee360Dialog
          token={token}
          employee={profileEmployee}
          onClose={() => setProfileEmployee(null)}
        />
      )}

      {importOpen && (
        <div className="modal-backdrop">
          <section className="modal wide">
            <div className="modal-head">
              <div>
                <div className="eyebrow">CSV IMPORT</div>
                <h2>Review {csvName}</h2>
                <p>Run a dry check before importing employee records.</p>
              </div>
              <button
                className="close-btn"
                onClick={() => setImportOpen(false)}
              >
                ×
              </button>
            </div>
            <p className="muted">
              Required columns: code, name, email, department, designation,
              joining_date (YYYY-MM-DD), basic_salary.
            </p>
            <div className="modal-actions">
              <button
                className="button secondary"
                onClick={runDryCheck}
                disabled={busy}
              >
                {busy ? "Checking…" : "Run dry check"}
              </button>
              <button
                className="button primary"
                onClick={importCsv}
                disabled={busy || validRows === 0 || dryRunRows.length > 0}
              >
                {busy ? "Importing…" : `Import ${validRows} valid rows`}
              </button>
            </div>
            {dryRunRows.length > 0 && (
              <div className="import-errors">
                {dryRunRows.map((row) => (
                  <div key={row.row}>
                    <b>Row {row.row}</b>
                    {row.errors.map((item) => (
                      <p key={`${item.field}-${item.reason}`}>
                        <strong>{item.field}:</strong> {item.reason}
                      </p>
                    ))}
                  </div>
                ))}
              </div>
            )}
            {dryRunRows.length === 0 && validRows > 0 && (
              <div className="alert success">
                Dry check passed for {validRows} rows.
              </div>
            )}
            {error && <div className="alert error">{error}</div>}
          </section>
        </div>
      )}

      {newEmployeeAccount && (
        <div className="modal-backdrop">
          <section className="modal">
            <div className="modal-mark">✓</div>
            <h2>{newEmployeeAccount.name} login is ready</h2>
            <p>
              Share this temporary password securely. The employee must change
              it at first sign-in.
            </p>
            <div className="account-details">
              <div>
                <span>Work email</span>
                <b>{newEmployeeAccount.email}</b>
              </div>
              <div>
                <span>Employee code</span>
                <b>{newEmployeeAccount.code}</b>
              </div>
              <div>
                <span>Company</span>
                <b>{newEmployeeAccount.companyName || "Company workspace"}</b>
              </div>
              <div>
                <span>Registered by</span>
                <b>{newEmployeeAccount.createdByName || "HR"}</b>
              </div>
            </div>
            <div className="temp-password">{newEmployeeAccount.password}</div>
            <button
              className="button primary full"
              onClick={() => {
                navigator.clipboard?.writeText(newEmployeeAccount.password);
                setNewEmployeeAccount(null);
              }}
            >
              Copy temporary password and close
            </button>
          </section>
        </div>
      )}
      {importCredentials.length > 0 && (
        <div className="modal-backdrop">
          <section className="modal wide">
            <div className="modal-mark">✓</div>
            <h2>Employee accounts created</h2>
            <p>
              Temporary passwords are shown once. Download this list and share
              it securely.
            </p>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>EMPLOYEE</th>
                    <th>EMAIL</th>
                    <th>CODE</th>
                    <th>TEMPORARY PASSWORD</th>
                  </tr>
                </thead>
                <tbody>
                  {importCredentials.map((item) => (
                    <tr key={item.email}>
                      <td>{item.name}</td>
                      <td>{item.email}</td>
                      <td>{item.code}</td>
                      <td>
                        <code>{item.password}</code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="modal-actions">
              <button
                className="button secondary"
                onClick={() => setImportCredentials([])}
              >
                Close
              </button>
              <button
                className="button primary"
                onClick={() => downloadCredentials(importCredentials)}
              >
                Download credentials CSV
              </button>
            </div>
          </section>
        </div>
      )}

      {showDeptModal && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) =>
            event.target === event.currentTarget &&
            !deptBusy &&
            setShowDeptModal(false)
          }
        >
          <section className="modal">
            <div className="modal-head">
              <div>
                <div className="eyebrow">ORGANIZATION</div>
                <h2>Add Department</h2>
                <p>Create a new department for employee assignments.</p>
              </div>
              <button
                type="button"
                className="close-btn"
                onClick={() => setShowDeptModal(false)}
                disabled={deptBusy}
              >
                ×
              </button>
            </div>
            <form onSubmit={saveDepartment}>
              {deptError && (
                <div className="alert error" role="alert">
                  {deptError}
                </div>
              )}
              <label>
                Department name
                <input
                  name="deptName"
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  placeholder="e.g. Engineering, Sales, Operations"
                  required
                  autoFocus
                />
              </label>
              <label>
                Description (optional)
                <textarea
                  name="deptDesc"
                  value={deptDesc}
                  onChange={(e) => setDeptDesc(e.target.value)}
                  placeholder="Brief description of responsibilities or functions…"
                  rows={3}
                />
              </label>
              <div className="modal-actions">
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => setShowDeptModal(false)}
                  disabled={deptBusy}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="button primary"
                  disabled={deptBusy || !deptName.trim()}
                >
                  {deptBusy ? "Adding…" : "Add department"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function EmployeeEditDialog({
  token,
  employee,
  departments,
  onClose,
  onSaved,
}: {
  token: string;
  employee: Employee;
  departments: string[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      await api("/employees/" + employee.id, {
        token,
        method: "PUT",
        body: jsonBody({
          name: form.get("name"),
          email: form.get("email"),
          department: form.get("department"),
          designation: form.get("designation"),
          joiningDate: form.get("joiningDate"),
          exitDate: form.get("exitDate"),
          basicSalary: Number(form.get("basicSalary")),
          allowances: Number(form.get("allowances")),
          phone: form.get("phone"),
          gender: form.get("gender"),
          status: form.get("status"),
        }),
      });
      await onSaved();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not update the employee.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <form className="modal wide" onSubmit={save}>
        <div className="modal-head">
          <div>
            <div className="eyebrow">EMPLOYEE RECORD</div>
            <h2>Edit {employee.name}</h2>
            <p>HR can update job details and salary structure.</p>
          </div>
          <button type="button" className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="form-grid">
          <label>
            Name
            <input name="name" defaultValue={employee.name} required />
          </label>
          <label>
            Email
            <input
              name="email"
              type="email"
              defaultValue={employee.email}
              required
            />
          </label>
          <label>
            Department
            <select
              name="department"
              defaultValue={employee.department}
              required
            >
              {departments.map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
          </label>
          <label>
            Designation
            <input
              name="designation"
              defaultValue={employee.designation}
              required
            />
          </label>
          <label>
            Joining date
            <input
              name="joiningDate"
              type="date"
              defaultValue={employee.joiningDate || ""}
              required
            />
          </label>
          <label>
            Last working day
            <input
              name="exitDate"
              type="date"
              defaultValue={employee.exitDate || ""}
            />
          </label>
          <label>
            Basic monthly salary (PKR)
            <input
              name="basicSalary"
              type="number"
              min="1"
              defaultValue={employee.basicSalary ?? ""}
              required
            />
          </label>
          <label>
            Additional allowances (PKR)
            <input
              name="allowances"
              type="number"
              min="0"
              defaultValue={employee.allowances || 0}
            />
          </label>
          <label>
            Phone
            <input name="phone" defaultValue={employee.phone || ""} />
          </label>
          <label>
            Status
            <select name="status" defaultValue={employee.status}>
              <option value="active">Active</option>
              <option value="probation">Probation</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
        </div>
        {error && <div className="alert error">{error}</div>}
        <div className="modal-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="button primary" disabled={busy}>
            {busy ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Employee360Dialog({
  token,
  employee,
  onClose,
}: {
  token: string;
  employee: Employee;
  onClose: () => void;
}) {
  const [profile, setProfile] = useState<any>(employee);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [leave, setLeave] = useState<any[]>([]);
  const [payslips, setPayslips] = useState<any[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      api<any>("/employees/" + employee.id, { token }),
      api<any[]>("/attendance?employeeId=" + employee.id, { token }),
      api<any[]>("/leaves?employeeId=" + employee.id, { token }),
      api<any[]>("/payslips?employeeId=" + employee.id, { token }),
    ])
      .then(([employeeProfile, attendanceRows, leaveRows, payslipRows]) => {
        setProfile(employeeProfile);
        setAttendance(attendanceRows);
        setLeave(leaveRows);
        setPayslips(payslipRows);
      })
      .catch((requestError) => setError(requestError.message));
  }, [employee.id, token]);

  return (
    <div className="modal-backdrop">
      <section className="modal wide employee-360">
        <div className="modal-head">
          <div>
            <div className="eyebrow">EMPLOYEE 360</div>
            <h2>{profile.name}</h2>
            <p>
              {profile.designation} · {profile.department} · {profile.code}
            </p>
          </div>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>
        {error && <div className="alert error">{error}</div>}
        <div className="employee-profile-grid">
          <div>
            <small>Work email</small>
            <b>{profile.email}</b>
          </div>
          <div>
            <small>Joining date</small>
            <b>
              {formatDate(profile.joiningDate || profile.joining_date || "")}
            </b>
          </div>
          <div>
            <small>Company</small>
            <b>{profile.companyName || "—"}</b>
          </div>
          <div>
            <small>Registered by</small>
            <b>{profile.createdByName || "—"}</b>
          </div>
          <div>
            <small>Status</small>
            <b>{profile.status}</b>
          </div>
          <div>
            <small>Basic monthly salary</small>
            <b>
              {formatMoney(profile.basicSalary || profile.basic_salary || 0)}
            </b>
          </div>
        </div>
        <div className="employee-360-grid">
          <section>
            <h3>Recent attendance</h3>
            {attendance.slice(0, 6).map((item) => (
              <p key={item.id}>
                {formatDate(item.date)} · {item.status}
              </p>
            ))}
            {!attendance.length && <small>No attendance records.</small>}
          </section>
          <section>
            <h3>Leave history</h3>
            {leave.slice(0, 6).map((item) => (
              <p key={item.id}>
                {item.type} · {item.status} · {item.days} days
              </p>
            ))}
            {!leave.length && <small>No leave requests.</small>}
          </section>
          <section>
            <h3>Payroll history</h3>
            {payslips.slice(0, 6).map((item) => (
              <p key={item.id}>
                {item.month} · {formatMoney(item.net)} net ·{" "}
                {item.finalized ? "finalized" : "draft"}
              </p>
            ))}
            {!payslips.length && <small>No payroll records.</small>}
          </section>
        </div>
      </section>
    </div>
  );
}

function formatDate(value: string) {
  if (!value) return "—";
  return new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString(
    "en-PK",
    { day: "numeric", month: "short", year: "numeric" },
  );
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function downloadCredentials(
  rows: { name: string; email: string; code: string; password: string }[],
) {
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const csv = [
    "name,email,code,temporary_password",
    ...rows.map((row) =>
      [row.name, row.email, row.code, row.password].map(escape).join(","),
    ),
  ].join("\r\n");
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "employee-temporary-logins.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="empty-state">
      <span>✳</span>
      <b>{text}</b>
      <small>New activity will show here.</small>
    </div>
  );
}
