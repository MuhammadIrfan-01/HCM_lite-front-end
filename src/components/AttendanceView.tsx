"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { api, jsonBody } from "@/lib/api";
import { Role } from "@/lib/types";

interface AttendanceViewProps {
  token: string;
  role: Role;
}

export default function AttendanceView({ token, role }: AttendanceViewProps) {
  const [records, setRecords] = useState<any[]>([]);
  const [corrections, setCorrections] = useState<any[]>([]);
  const [date, setDate] = useState(new Date().toLocaleDateString("en-CA"));
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [inspectPhoto, setInspectPhoto] = useState<any | null>(null);

  async function load() {
    const params = new URLSearchParams();
    if (role !== "employee") params.set("date", date);
    const attendance = await api<any[]>(
      `/attendance${params.size ? `?${params}` : ""}`,
      { token },
    );
    setRecords(attendance);
    if (role === "employee") {
      setCorrections(
        await api<any[]>("/attendance/corrections/mine", { token }),
      );
    } else if (role === "hr" || role === "admin") {
      setCorrections(await api<any[]>("/attendance/corrections", { token }));
    }
  }

  useEffect(() => {
    load().catch((requestError) => setError(requestError.message));
  }, [token, role, date]);

  function requestCheckIn() {
    setError("");
    setNotice("");
    setCameraOpen(true);
  }

  async function performCheckIn(photoBase64: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const res = await api<any>("/attendance/check-in", {
        token,
        method: "POST",
        body: jsonBody({ source: "web", photo: photoBase64 }),
      });
      const checkInTime = res?.check_in || res?.checkIn;
      setNotice(
        `Checked in successfully with face verification${checkInTime ? ` at ${formatTime(checkInTime)}` : ""}. Your shift is now active!`,
      );
      setCameraOpen(false);
      await load();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not check in.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function checkOut() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const res = await api<any>("/attendance/check-out", {
        token,
        method: "POST",
        body: jsonBody({}),
      });
      const checkOutTime = res?.check_out || res?.checkOut;
      const hours =
        res?.hoursWorked != null ? ` (${res.hoursWorked} hours logged)` : "";
      setNotice(
        `Checked out successfully${checkOutTime ? ` at ${formatTime(checkOutTime)}` : ""}${hours}. Have a wonderful day!`,
      );
      await load();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not check out.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function submitCorrection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      await api("/attendance/corrections", {
        token,
        method: "POST",
        body: jsonBody({
          date: form.get("date"),
          checkIn: form.get("checkIn"),
          checkOut: form.get("checkOut"),
          reason: form.get("reason"),
        }),
      });
      setRequestOpen(false);
      setNotice("Correction request submitted for HR review.");
      await load();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not request a correction.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function reviewCorrection(id: string, status: "approved" | "rejected") {
    const comment = window.prompt(
      status === "approved"
        ? "Optional approval note:"
        : "Reason for rejection:",
    );
    if (comment === null) return;
    const finalComment =
      comment.trim() || (status === "approved" ? "Approved" : "Rejected");
    setError("");
    try {
      await api(`/attendance/corrections/${id}/review`, {
        token,
        method: "PATCH",
        body: jsonBody({ status, comment: finalComment }),
      });
      setNotice(`Correction request ${status}.`);
      await load();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not review the correction.",
      );
    }
  }

  const todayEnCa = new Date().toLocaleDateString("en-CA");
  const todayIso = new Date().toISOString().slice(0, 10);

  // Look for any active check-in where check_out is null/empty
  const activeOpenRecord = records.find(
    (record) =>
      !record.synthetic &&
      Boolean(record.check_in || record.checkIn) &&
      !record.check_out &&
      !record.checkOut,
  );

  // Today's attendance record (or fallback to any active open check-in)
  const todayRecord =
    records.find(
      (record) =>
        !record.synthetic &&
        (record.date === todayEnCa || record.date === todayIso),
    ) || activeOpenRecord;

  const hasCheckedIn = Boolean(
    todayRecord && (todayRecord.check_in || todayRecord.checkIn),
  );
  const hasCheckedOut = Boolean(
    todayRecord && (todayRecord.check_out || todayRecord.checkOut),
  );

  return (
    <>
      <section className="panel full-panel">
        <div className="panel-heading">
          <div>
            <h3>
              {role === "employee" ? "My attendance" : "Daily attendance board"}
            </h3>
            <p>Check-in and check-out times are recorded securely by the server.</p>
          </div>
          {role === "employee" ? (
            <div className="inline-actions">
              {!hasCheckedIn ? (
                <button
                  type="button"
                  className="button primary"
                  disabled={busy}
                  onClick={requestCheckIn}
                >
                  {busy ? "Checking in…" : "Check in"}
                </button>
              ) : !hasCheckedOut ? (
                <button
                  type="button"
                  className="button secondary checkout-btn"
                  disabled={busy}
                  onClick={checkOut}
                  title="Record your departure time"
                >
                  {busy ? "Checking out…" : "Check out"}
                </button>
              ) : (
                <span className="badge approved">✓ Day complete</span>
              )}
              <button
                type="button"
                className="button secondary"
                onClick={() => setRequestOpen(true)}
              >
                Request correction
              </button>
            </div>
          ) : (
            <label className="date-filter">
              Attendance date
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </label>
          )}
        </div>

        {notice && (
          <div className="alert success" role="status">
            <span>{notice}</span>
            <button
              type="button"
              onClick={() => setNotice("")}
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
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError("")}
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

        {/* Live Employee Shift Status Bar */}
        {role === "employee" && (
          <div className="employee-attendance-status-card">
            <div className="status-card-icon" aria-hidden="true">
              {!hasCheckedIn ? "⏱️" : !hasCheckedOut ? "🟢" : "✅"}
            </div>
            <div className="status-card-content">
              <b>
                {!hasCheckedIn
                  ? "You have not checked in today."
                  : !hasCheckedOut
                    ? `Shift in progress · Checked in at ${formatTime(todayRecord?.check_in || todayRecord?.checkIn)}`
                    : `Shift complete · In: ${formatTime(todayRecord?.check_in || todayRecord?.checkIn)} | Out: ${formatTime(todayRecord?.check_out || todayRecord?.checkOut)}`}
              </b>
              <small>
                {!hasCheckedIn
                  ? "Click the 'Check in' button to start logging your shift."
                  : !hasCheckedOut
                    ? "Click 'Check out' when you finish your shift to record hours worked."
                    : "Your departure and working hours for today are saved."}
              </small>
            </div>
            {!hasCheckedIn ? (
              <button
                type="button"
                className="button primary small-button"
                disabled={busy}
                onClick={requestCheckIn}
              >
                {busy ? "Checking in…" : "Check in now"}
              </button>
            ) : !hasCheckedOut ? (
              <button
                type="button"
                className="button primary small-button checkout-action-btn"
                disabled={busy}
                onClick={checkOut}
              >
                {busy ? "Checking out…" : "Check out now"}
              </button>
            ) : null}
          </div>
        )}

        <AttendanceTable
          rows={records}
          own={role === "employee"}
          onViewPhoto={setInspectPhoto}
        />
      </section>

      {role === "employee" && (
        <section className="panel full-panel section-spacer">
          <div className="panel-heading">
            <div>
              <h3>Correction requests</h3>
              <p>HR reviews requests with a reason.</p>
            </div>
          </div>
          <CorrectionTable
            rows={corrections}
            canReview={false}
            onReview={reviewCorrection}
          />
        </section>
      )}

      {(role === "hr" || role === "admin") && (
        <section className="panel full-panel section-spacer">
          <div className="panel-heading">
            <div>
              <h3>Correction inbox</h3>
              <p>Approve or reject attendance corrections.</p>
            </div>
          </div>
          <CorrectionTable
            rows={corrections}
            canReview={role === "hr" || role === "admin"}
            onReview={reviewCorrection}
          />
        </section>
      )}

      {requestOpen && (
        <div className="modal-backdrop">
          <form className="modal" onSubmit={submitCorrection}>
            <div className="modal-head">
              <div>
                <div className="eyebrow">ATTENDANCE</div>
                <h2>Request a correction</h2>
                <p>HR will review the details you provide.</p>
              </div>
              <button
                className="close-btn"
                type="button"
                onClick={() => setRequestOpen(false)}
              >
                ×
              </button>
            </div>
            <label>
              Date
              <input type="date" name="date" max={todayEnCa} required />
            </label>
            <div className="form-grid">
              <label>
                Requested check-in
                <input type="datetime-local" name="checkIn" />
              </label>
              <label>
                Requested check-out
                <input type="datetime-local" name="checkOut" />
              </label>
            </div>
            <label>
              Reason
              <textarea name="reason" rows={3} required />
            </label>
            <div className="modal-actions">
              <button
                className="button secondary"
                type="button"
                onClick={() => setRequestOpen(false)}
              >
                Cancel
              </button>
              <button className="button primary" disabled={busy}>
                Send for review
              </button>
            </div>
          </form>
        </div>
      )}

      {cameraOpen && (
        <CameraCheckInModal
          onCapture={performCheckIn}
          onClose={() => setCameraOpen(false)}
          busy={busy}
        />
      )}

      {inspectPhoto && (
        <div
          className="modal-backdrop"
          onClick={() => setInspectPhoto(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="modal"
            style={{ maxWidth: "460px", textAlign: "center" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-head" style={{ marginBottom: "16px" }}>
              <div>
                <div className="eyebrow">ATTENDANCE VERIFICATION</div>
                <h2>Check-in Face Photo</h2>
                <p>Captured via front camera at shift start</p>
              </div>
              <button
                className="close-btn"
                type="button"
                onClick={() => setInspectPhoto(null)}
              >
                ×
              </button>
            </div>
            <div className="face-photo-preview-box">
              <img
                src={inspectPhoto.photo}
                alt={inspectPhoto.name || "Employee"}
                className="face-photo-full"
              />
            </div>
            <div className="face-photo-meta-card">
              <div style={{ fontSize: "15px", marginBottom: "4px" }}>
                <b>{inspectPhoto.name || "Employee"}</b> · <span>{inspectPhoto.code || "—"}</span>
              </div>
              <small style={{ color: "var(--muted)", display: "block" }}>
                {inspectPhoto.department || "General"} · {formatDate(inspectPhoto.date)} at {formatTime(inspectPhoto.check_in || inspectPhoto.checkIn)}
              </small>
              <div style={{ marginTop: "10px" }}>
                <span
                  className={`badge ${
                    inspectPhoto.status === "late" || inspectPhoto.status === "half_day"
                      ? "pending"
                      : "approved"
                  }`}
                >
                  {String(inspectPhoto.status).replace("_", " ")}
                </span>
              </div>
            </div>
            <div className="modal-actions" style={{ marginTop: "18px" }}>
              <button
                className="button secondary"
                type="button"
                style={{ width: "100%", justifyContent: "center" }}
                onClick={() => setInspectPhoto(null)}
              >
                Close preview
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function AttendanceTable({
  rows,
  own,
  onViewPhoto,
}: {
  rows: any[];
  own: boolean;
  onViewPhoto: (record: any) => void;
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {!own && <th>EMPLOYEE</th>}
            {!own && <th>DEPARTMENT</th>}
            <th>PHOTO</th>
            <th>DATE</th>
            <th>CHECK IN</th>
            <th>CHECK OUT</th>
            {own && <th>HOURS</th>}
            <th>STATUS</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((record) => {
            const inVal = record.check_in || record.checkIn;
            const outVal = record.check_out || record.checkOut;
            const workedHours =
              outVal && inVal
                ? (new Date(outVal).getTime() - new Date(inVal).getTime()) /
                  3_600_000
                : null;
            return (
              <tr key={record.id}>
                {!own && (
                  <td>
                    {record.name}
                    <small>{record.code}</small>
                  </td>
                )}
                {!own && <td>{record.department}</td>}
                <td>
                  {record.photo ? (
                    <button
                      type="button"
                      className="photo-thumb-btn"
                      onClick={() => onViewPhoto(record)}
                      title="Click to view employee face photo"
                    >
                      <img
                        src={record.photo}
                        alt={record.name || "Employee"}
                        className="attendance-face-thumb"
                      />
                      <span>View</span>
                    </button>
                  ) : (
                    <span style={{ color: "#aaa" }}>—</span>
                  )}
                </td>
                <td>{formatDate(record.date)}</td>
                <td>{formatTime(inVal)}</td>
                <td>{formatTime(outVal)}</td>
                {own && (
                  <td>
                    {workedHours === null
                      ? "—"
                      : `${Math.max(0, workedHours).toFixed(1)}h`}
                  </td>
                )}
                <td>
                  <span
                    className={`badge ${
                      record.status === "late" || record.status === "half_day"
                        ? "pending"
                        : "approved"
                    }`}
                  >
                    {String(record.status).replace("_", " ")}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {rows.length === 0 && (
        <EmptyState text="No attendance records found" />
      )}
    </div>
  );
}

function CameraCheckInModal({
  onCapture,
  onClose,
  busy,
}: {
  onCapture: (photo: string) => Promise<void>;
  onClose: () => void;
  busy: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState("");
  const [starting, setStarting] = useState(true);

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const startCamera = async () => {
    setStarting(true);
    setCameraError("");
    setCapturedPhoto(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.warn("Front camera access error:", err);
      setCameraError(
        err.name === "NotAllowedError" || err.name === "PermissionDeniedError"
          ? "Camera permission denied. Please allow camera access in your browser or upload a selfie."
          : "Could not activate front camera. You can upload a selfie photo below to check in."
      );
    } finally {
      setStarting(false);
    }
  };

  useEffect(() => {
    void startCamera();
    return () => {
      stopStream();
    };
  }, []);

  const takePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Mirror horizontally for natural selfie perspective
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
    setCapturedPhoto(dataUrl);
    stopStream();
  };

  const retake = () => {
    void startCamera();
  };

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setCapturedPhoto(reader.result);
        setCameraError("");
        stopStream();
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal"
        style={{ maxWidth: "480px", textAlign: "center" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head" style={{ marginBottom: "16px" }}>
          <div>
            <div className="eyebrow">ATTENDANCE CHECK-IN</div>
            <h2>Face Photo Required</h2>
            <p>Please look into your front camera to verify your attendance.</p>
          </div>
          <button className="close-btn" type="button" onClick={onClose} disabled={busy}>
            ×
          </button>
        </div>

        <div className="camera-container">
          <canvas ref={canvasRef} style={{ display: "none" }} />
          {!capturedPhoto ? (
            <>
              {starting && (
                <div style={{ color: "#fff", fontSize: "13px" }}>
                  Starting front camera…
                </div>
              )}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="camera-video"
                style={{ display: starting || cameraError ? "none" : "block" }}
              />
              {!starting && !cameraError && (
                <>
                  <div className="camera-live-badge">
                    <span className="camera-live-dot" /> LIVE CAMERA
                  </div>
                  <div className="camera-face-guide">
                    <span>Align face here</span>
                  </div>
                </>
              )}
              {cameraError && (
                <div style={{ padding: "20px", color: "#f87171", fontSize: "13px" }}>
                  {cameraError}
                </div>
              )}
            </>
          ) : (
            <img
              src={capturedPhoto}
              alt="Captured Selfie"
              className="camera-captured-img"
            />
          )}
        </div>

        {!capturedPhoto ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", alignItems: "center" }}>
            {!cameraError && (
              <button
                type="button"
                className="button primary"
                style={{ width: "100%", justifyContent: "center" }}
                onClick={takePhoto}
                disabled={starting}
              >
                📸 Capture Photo
              </button>
            )}
            <label style={{ fontSize: "12px", color: "#6366f1", cursor: "pointer", margin: "6px 0 0" }}>
              📁 Or upload a selfie from your device
              <input
                type="file"
                accept="image/*"
                capture="user"
                style={{ display: "none" }}
                onChange={handleFileUpload}
              />
            </label>
          </div>
        ) : (
          <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
            <button
              type="button"
              className="button secondary"
              onClick={retake}
              disabled={busy}
            >
              🔄 Retake
            </button>
            <button
              type="button"
              className="button primary"
              onClick={() => onCapture(capturedPhoto)}
              disabled={busy}
            >
              {busy ? "Checking in…" : "✅ Confirm Check-in"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function CorrectionTable({
  rows,
  canReview,
  onReview,
}: {
  rows: any[];
  canReview: boolean;
  onReview: (id: string, status: "approved" | "rejected") => void;
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>DATE</th>
            <th>REQUESTED TIMES</th>
            <th>REASON</th>
            <th>STATUS</th>
            {canReview && <th>ACTION</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((item) => (
            <tr key={item.id}>
              <td>{formatDate(item.date)}</td>
              <td>
                <small>
                  In: {formatTime(item.requestedCheckIn || item.checkIn)} · Out:{" "}
                  {formatTime(item.requestedCheckOut || item.checkOut)}
                </small>
              </td>
              <td>{item.reason}</td>
              <td>
                <span className={`badge ${item.status}`}>
                  {item.status}
                </span>
              </td>
              {canReview && (
                <td>
                  {item.status === "pending" ? (
                    <div className="row-actions">
                      <button onClick={() => onReview(item.id, "approved")}>
                        Approve
                      </button>
                      <button onClick={() => onReview(item.id, "rejected")}>
                        Reject
                      </button>
                    </div>
                  ) : (
                    item.comment || "—"
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <EmptyState text="No correction requests" />}
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

function formatTime(value?: string | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleTimeString("en-PK", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="empty-state">
      <span>◷</span>
      <b>{text}</b>
      <small>Attendance activity will appear here.</small>
    </div>
  );
}
