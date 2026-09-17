import React, { useEffect, useState, useCallback } from "react";
import { api } from "../api.js";

function fmt(dt) {
  if (!dt) return "—";
  return new Date(dt).toLocaleString();
}

function SortHeader({ label, field, filters, onSort }) {
  const active = filters.sort_by === field;
  return (
    <th>
      <button onClick={() => onSort(field)}>
        {label}{active ? (filters.order === "asc" ? " ↑" : " ↓") : ""}
      </button>
    </th>
  );
}

export default function Sessions() {
  const [data, setData] = useState({ items: [], total: 0 });
  const [filters, setFilters] = useState({ search: "", active_only: "", sort_by: "check_in", order: "desc", page: 1 });
  const pageSize = 15;
  const [clockBusy, setClockBusy] = useState(false);
  const [clockMessage, setClockMessage] = useState("");

  const load = useCallback(() => {
    const params = { ...filters, page_size: pageSize };
    if (params.active_only === "") delete params.active_only;
    api.sessions(params).then(setData).catch(() => {});
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  function updateFilter(patch) {
    setFilters((f) => ({ ...f, ...patch, page: patch.page ?? 1 }));
  }

  function onSort(field) {
    setFilters((f) => ({
      ...f,
      sort_by: field,
      order: f.sort_by === field && f.order === "asc" ? "desc" : "asc",
      page: 1,
    }));
  }

  const totalPages = Math.max(1, Math.ceil(data.total / pageSize));

  async function runClock() {
    setClockBusy(true);
    setClockMessage("");
    try {
      const result = await api.clock();
      setClockMessage(`${result.closed} session${result.closed === 1 ? "" : "s"} auto-closed and billed.`);
      load();
    } catch (err) {
      setClockMessage(err.message);
    } finally {
      setClockBusy(false);
    }
  }

  return (
    <div>
      <h3 style={{ marginBottom: "1rem" }}>Session log</h3>

      <div className="card" style={{ marginBottom: "1rem", display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
        <button onClick={runClock} disabled={clockBusy}>Run nightly clock</button>
        {clockMessage && <span style={{ color: "var(--text-muted)" }}>{clockMessage}</span>}
      </div>

      <div className="card" style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", gap: "0.8rem", flexWrap: "wrap", alignItems: "flex-end" }}>
          <div className="field" style={{ marginBottom: 0, flex: "1 1 200px" }}>
            <label>Search plate</label>
            <input placeholder="e.g. RJ14" value={filters.search} onChange={(e) => updateFilter({ search: e.target.value })} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Status</label>
            <select value={filters.active_only} onChange={(e) => updateFilter({ active_only: e.target.value })}>
              <option value="">All</option>
              <option value="true">Active only</option>
              <option value="false">Completed only</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card" style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <SortHeader label="Plate" field="plate" filters={filters} onSort={onSort} />
              <th>Spot</th>
              <SortHeader label="Check-in" field="check_in" filters={filters} onSort={onSort} />
              <SortHeader label="Check-out" field="check_out" filters={filters} onSort={onSort} />
              <SortHeader label="Fee" field="fee" filters={filters} onSort={onSort} />
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((s) => (
              <tr key={s.id}>
                <td className="mono">{s.plate}</td>
                <td>{s.spot_label} <span style={{ color: "var(--text-muted)" }}>({s.spot_type})</span></td>
                <td>{fmt(s.check_in)}</td>
                <td>{fmt(s.check_out)}</td>
                <td className="mono">{s.fee != null ? `$${s.fee.toFixed(2)}` : "—"}</td>
                <td><span className={`badge ${s.is_active ? "occupied" : "available"}`}>{s.is_active ? "active" : "done"}</span></td>
              </tr>
            ))}
            {data.items.length === 0 && (
              <tr><td colSpan={6} style={{ color: "var(--text-muted)" }}>No sessions match.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <button disabled={filters.page <= 1} onClick={() => updateFilter({ page: filters.page - 1 })}>Prev</button>
        <span>Page {filters.page} of {totalPages} — {data.total} sessions</span>
        <button disabled={filters.page >= totalPages} onClick={() => updateFilter({ page: filters.page + 1 })}>Next</button>
      </div>
    </div>
  );
}
