import React, { useEffect, useState, useCallback } from "react";
import { api } from "../api.js";

const SPOT_TYPES = ["compact", "standard", "ev"];

export default function Dashboard() {
  const [availability, setAvailability] = useState([]);
  const [rates, setRates] = useState(null);

  const [ciPlate, setCiPlate] = useState("");
  const [ciType, setCiType] = useState("standard");
  const [coPlate, setCoPlate] = useState("");
  const [transferPlate, setTransferPlate] = useState("");
  const [newPlate, setNewPlate] = useState("");
  const [rateFile, setRateFile] = useState(null);

  const [message, setMessage] = useState(null); // {type, text}
  const [busy, setBusy] = useState(false);

  const [spots, setSpots] = useState({ items: [], total: 0 });
  const [filters, setFilters] = useState({ search: "", spot_type: "", status: "", sort_by: "label", order: "asc", page: 1 });
  const pageSize = 24;

  const loadAvailability = useCallback(() => {
    api.availability().then(setAvailability).catch(() => {});
  }, []);

  const loadSpots = useCallback(() => {
    api.spots({ ...filters, page_size: pageSize }).then(setSpots).catch(() => {});
  }, [filters]);

  useEffect(() => {
    loadAvailability();
    loadSpots();
    api.rates().then(setRates).catch(() => {});
  }, [loadAvailability, loadSpots]);

  function flash(type, text) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4500);
  }

  async function onCheckIn(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const s = await api.checkIn(ciPlate.trim(), ciType);
      flash("success", `${s.plate} checked in to ${s.spot_label}`);
      setCiPlate("");
      loadAvailability();
      loadSpots();
    } catch (err) {
      flash("error", err.message);
    } finally {
      setBusy(false);
    }
  }

  async function onCheckOut(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const s = await api.checkOut(coPlate.trim());
      flash("success", `${s.plate} checked out of ${s.spot_label} — fee $${s.fee.toFixed(2)}`);
      setCoPlate("");
      loadAvailability();
      loadSpots();
    } catch (err) {
      flash("error", err.message);
    } finally {
      setBusy(false);
    }
  }

  async function onTransfer(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const session = await api.transfer(transferPlate.trim(), newPlate.trim());
      flash("success", `Session transferred to ${session.plate}; spot ${session.spot_label} and entry time preserved`);
      setTransferPlate("");
      setNewPlate("");
    } catch (err) {
      flash("error", err.message);
    } finally {
      setBusy(false);
    }
  }

  async function onImportRates(e) {
    e.preventDefault();
    if (!rateFile) return;
    setBusy(true);
    try {
      await api.importRates(rateFile);
      const updatedRates = await api.rates();
      setRates(updatedRates);
      flash("success", "Rate card imported; junk rows were ignored");
      setRateFile(null);
      e.target.reset();
    } catch (err) {
      flash("error", err.message);
    } finally {
      setBusy(false);
    }
  }

  function updateFilter(patch) {
    setFilters((f) => ({ ...f, ...patch, page: patch.page ?? 1 }));
  }

  const totalPages = Math.max(1, Math.ceil(spots.total / pageSize));

  return (
    <div>
      {message && <div className={message.type === "error" ? "error-banner" : "success-banner"}>{message.text}</div>}

      <div className="stat-row">
        {availability.map((a) => (
          <div className={`stat ${a.available === 0 ? "warn" : "ok"}`} key={a.spot_type}>
            <div className="n">{a.available}/{a.total}</div>
            <div className="label">{a.spot_type} free</div>
          </div>
        ))}
        {rates && (
          <div className="stat">
            <div className="n mono" style={{ fontSize: "1.3rem" }}>
              ${rates.first_hour_rate}/${rates.extra_hour_rate}
            </div>
            <div className="label">1st hr / extra hr — cap ${rates.daily_cap}</div>
          </div>
        )}
      </div>

      <div className="grid-2" style={{ marginBottom: "2rem" }}>
        <div className="card">
          <h3 style={{ marginBottom: "1rem" }}>Check in</h3>
          <form onSubmit={onCheckIn}>
            <div className="field">
              <label htmlFor="ci-plate">Plate</label>
              <input id="ci-plate" value={ciPlate} onChange={(e) => setCiPlate(e.target.value)} required placeholder="e.g. RJ14 AB1234" />
            </div>
            <div className="field">
              <label htmlFor="ci-type">Spot type</label>
              <select id="ci-type" value={ciType} onChange={(e) => setCiType(e.target.value)}>
                {SPOT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <button className="primary" type="submit" disabled={busy}>Check in</button>
          </form>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: "1rem" }}>Check out</h3>
          <form onSubmit={onCheckOut}>
            <div className="field">
              <label htmlFor="co-plate">Plate</label>
              <input id="co-plate" value={coPlate} onChange={(e) => setCoPlate(e.target.value)} required placeholder="e.g. RJ14 AB1234" />
            </div>
            <button type="submit" disabled={busy}>Check out &amp; get fee</button>
          </form>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: "1rem" }}>Transfer open session</h3>
          <form onSubmit={onTransfer}>
            <div className="field">
              <label htmlFor="transfer-plate">Current plate</label>
              <input id="transfer-plate" value={transferPlate} onChange={(e) => setTransferPlate(e.target.value)} required placeholder="e.g. RJ14 AB1234" />
            </div>
            <div className="field">
              <label htmlFor="new-plate">New plate</label>
              <input id="new-plate" value={newPlate} onChange={(e) => setNewPlate(e.target.value)} required placeholder="e.g. RJ14 XY5678" />
            </div>
            <button type="submit" disabled={busy}>Transfer session</button>
          </form>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: "1rem" }}>Import rate card</h3>
          <form onSubmit={onImportRates}>
            <div className="field">
              <label htmlFor="rate-file">Messy rate card</label>
              <input id="rate-file" type="file" accept=".txt,.csv,text/plain,text/csv" onChange={(e) => setRateFile(e.target.files[0] || null)} required />
            </div>
            <button type="submit" disabled={busy || !rateFile}>Import cleaned rates</button>
          </form>
        </div>
      </div>

      <h3 style={{ marginBottom: "1rem" }}>Floor</h3>
      <div className="card" style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", gap: "0.8rem", flexWrap: "wrap", alignItems: "flex-end" }}>
          <div className="field" style={{ marginBottom: 0, flex: "1 1 180px" }}>
            <label>Search label</label>
            <input placeholder="e.g. L2-E" value={filters.search} onChange={(e) => updateFilter({ search: e.target.value })} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Type</label>
            <select value={filters.spot_type} onChange={(e) => updateFilter({ spot_type: e.target.value })}>
              <option value="">All</option>
              {SPOT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Status</label>
            <select value={filters.status} onChange={(e) => updateFilter({ status: e.target.value })}>
              <option value="">All</option>
              <option value="available">Available</option>
              <option value="occupied">Occupied</option>
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Sort by</label>
            <select value={filters.sort_by} onChange={(e) => updateFilter({ sort_by: e.target.value })}>
              <option value="label">Label</option>
              <option value="level">Level</option>
              <option value="spot_type">Type</option>
              <option value="status">Status</option>
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Order</label>
            <select value={filters.order} onChange={(e) => updateFilter({ order: e.target.value })}>
              <option value="asc">Asc</option>
              <option value="desc">Desc</option>
            </select>
          </div>
        </div>
      </div>

      <div className="spot-grid">
        {spots.items.map((s) => (
          <div className={`spot-tile ${s.status}`} key={s.id}>
            <div>{s.label}</div>
            <div style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
              {s.spot_type}{s.has_charger ? " ⚡" : ""}
            </div>
          </div>
        ))}
      </div>

      <div className="pagination">
        <button disabled={filters.page <= 1} onClick={() => updateFilter({ page: filters.page - 1 })}>Prev</button>
        <span>Page {filters.page} of {totalPages} — {spots.total} spots</span>
        <button disabled={filters.page >= totalPages} onClick={() => updateFilter({ page: filters.page + 1 })}>Next</button>
      </div>
    </div>
  );
}
