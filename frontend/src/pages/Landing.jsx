import React from "react";
import { Link } from "react-router-dom";

const FEATURES = [
  {
    title: "One-tap check-in and check-out",
    desc: "Type a plate, pick a spot type, done. The system finds the nearest open spot of that type and starts the clock — no paper log, no guessing which bay is free.",
  },
  {
    title: "Fees that price themselves",
    desc: "First hour, extra hours, and a daily cap are all worked out automatically the moment a car checks out. No mental math at the barrier.",
  },
  {
    title: "Live floor availability",
    desc: "Answer 'is an EV spot free right now?' in one glance, per level and per type, instead of walking the floor.",
  },
  {
    title: "Find any car by plate",
    desc: "Search the log by plate to see exactly which spot a car is in, when it arrived, and what it's cost so far.",
  },
  {
    title: "A spot type for every vehicle",
    desc: "Compact, standard, and EV-with-charger spots are tracked separately, so an EV is never sent to a bay without a charger.",
  },
  {
    title: "A log that scales with a long day",
    desc: "Sort and page through thousands of check-ins without the list becoming unreadable by evening.",
  },
];

const ROADMAP = [
  {
    title: "License-plate camera recognition",
    desc: "Auto-detect plates at the barrier so the attendant never has to type one in.",
  },
  {
    title: "Reserved & monthly-pass spots",
    desc: "Let regular tenants hold a spot instead of competing for open ones every morning.",
  },
  {
    title: "Manager analytics dashboard",
    desc: "Occupancy trends, peak hours, and revenue by spot type, for the garage's owner rather than its attendant.",
  },
];

export default function Landing() {
  return (
    <div>
      <section className="hero">
        <div className="stripe" />
        <div className="container">
          <h1>Every car, the right spot, the right fee.</h1>
          <p className="lede">
            Gantry is the attendant's console for a busy multi-level garage — check a car in,
            find it again by plate, and never send an EV to a spot without a charger.
          </p>
          <div className="cta-row">
            <Link to="/register"><button className="primary">Get started</button></Link>
            <Link to="/login"><button>Sign in</button></Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2>Built for the person standing at the barrier</h2>
          <div className="grid-3">
            {FEATURES.map((f) => (
              <div className="feature" key={f.title}>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section tight">
        <div className="container">
          <h2>Who it's for</h2>
          <p style={{ color: "var(--text-muted)", maxWidth: "70ch" }}>
            Gantry is built for the attendants and shift supervisors running a city-centre
            parking garage day to day — not for drivers. It replaces a clipboard, a whiteboard
            of spot numbers, and a calculator, with one screen that knows what's free, what's
            occupied, and what every car owes.
          </p>
        </div>
      </section>

      <section className="section tight">
        <div className="container">
          <h2>What's next</h2>
          {ROADMAP.map((r, i) => (
            <div className="roadmap-item" key={r.title}>
              <span className="idx">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <h3 style={{ fontSize: "1rem" }}>{r.title}</h3>
                <p style={{ color: "var(--text-muted)", margin: "0.2rem 0 0" }}>{r.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="site">Gantry — built for the Round 2 builder brief.</footer>
    </div>
  );
}
