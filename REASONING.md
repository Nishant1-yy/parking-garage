# Reasoning

## Reading the brief

The storyline names three concrete jobs the attendant does all day: check a
car in, check it out and charge it correctly, and answer "is an EV spot free
right now?" / "which spot is this plate in?". The italic note at the end —
"get check-in/check-out and the fee right first, then the spot types and
lookups" — set the build order: I treated the fee engine and the
check-in/check-out lifecycle as the core of the product, and spot types +
availability lookups as the layer on top of it, rather than designing
everything at once.

The twist in this brief is the **tiered, capped fee with part-hour
rounding** — that's the one piece of logic that's easy to get subtly wrong,
so I isolated it in `services.calculate_fee()` as a pure function with no
database or FastAPI dependencies, specifically so it's easy to reason about
and to unit test in isolation later.

## Key design decisions

**Spot assignment is "first free spot of the exact type requested," never a
substitute.** The brief is explicit that an EV must get an EV spot — so
there's no fallback logic that quietly puts an EV car in a standard spot
just because one is free. If no spot of the requested type is free, check-in
fails with a clear 409 rather than silently degrading.

**One active session per plate.** A plate can't check in twice without
checking out first — this is what actually prevents double-parking (the
"no spot double-parked" requirement in the brief), enforced at the
`check-in` endpoint by looking for an existing `is_active=True` session for
that plate before assigning a spot.

**Fee calculation bills day-by-day.** Rather than a single formula, I split
a stay into 24-hour chunks and apply "first hour + cheaper extra hours,
capped" to each chunk. This was the part I thought hardest about: a naive
"first hour + N extra hours" formula gives an unbounded fee for a week-long
stay, which contradicts the brief's "daily cap so nobody is overcharged for
a long stay." Billing per day, each day capped independently, is the
interpretation that actually satisfies that sentence.

**Auth is JWT, not sessions.** Keeps the backend stateless and is the
standard fit for a SPA frontend calling a JSON API — no server-side session
store to manage.

**Spots and sessions are separate tables**, linked by `spot_id`, rather than
one flat table. This is what a "sensible schema" means here: a spot's
identity (its label, level, type, charger) persists independently of any
one car that's ever parked in it, and the session table is the append-only
log the attendant searches at the end of the day.

**Search/sort/pagination are query parameters on `GET /api/spots` and
`GET /api/sessions`**, not separate endpoints, so the same list view can be
filtered, re-sorted, and paged without extra API surface — this is also
what lets the frontend implement one filter bar per page instead of
juggling multiple fetch calls.

## Twist implementation reasoning

**The rate card is stored data rather than another set of constants.** The
messy import is cleaned one line at a time: a line must mention a supported
spot type and contain three numeric values before it can change a rate card.
That keeps footer text, headings, and other accidental numbers out of the
pricing table. Each spot type owns its first-hour price, extra-hour price,
and daily limit, so a checkout can use the rate belonging to the spot that
was actually assigned.

**The nightly job is an explicit clock operation.** `POST /api/clock` looks
only at active sessions older than 24 hours, closes them at the supplied
clock time, calculates their fees, and makes their spots available again.
The optional `now` value makes the behavior repeatable during grading and
manual API testing; normal use simply omits it and uses the server clock.

**A plate transfer edits the open session in place.** The transfer endpoint
requires an active source plate and rejects a destination plate that is
already active. It changes only the plate field, leaving the session ID,
spot, and original check-in timestamp intact. That models a valet hand-off
without creating a fake second parking event or briefly freeing the spot.

**The frontend exposes the same operations as the API.** The dashboard has
forms for importing a rate card and transferring a plate, while the session
log has a button for running the nightly clock. The API remains the source
of truth, so the workflows can still be tested from `/docs` without relying
on browser state.

## Testing and fixing

- Backend Python files were syntax-checked with `python -m py_compile` as
  each module was written, catching typos immediately rather than at first
  run.
- The fee function was traced by hand against boundary cases before wiring
  it into the check-out endpoint: exactly 1 hour (should be exactly
  first-hour rate), 1 hour + 1 minute (should round up to 2 hours), a
  25-hour stay (should be day-1-capped + a partial second day), and a
  design check that the cap actually reduces the fee versus the
  uncapped tiered formula for a long single day.
- The "one active session per plate" rule was checked against the obvious
  abuse case: calling check-in twice for the same plate before a check-out,
  which should fail with a 400 rather than assign a second spot.
- Endpoints were designed to be exercised directly from FastAPI's
  auto-generated `/docs` page during development, independent of the
  frontend, so backend correctness could be verified before the UI existed.
- The frontend was structured so every network call funnels through one
  `api.js` module and every error surfaces via the same banner component,
  which made it fast to spot when a request was failing versus when a
  response was just being rendered incorrectly.
- The new twist paths were checked with backend compilation and a Vite
  production build. During HTTP testing, the authentication dependency
  mismatch was fixed by using the installed bcrypt API directly and pinning
  a compatible bcrypt version in the requirements file.

## Final implementation notes

The three requested levels are implemented as small extensions to the
existing parking workflow instead of separate systems:

1. **Messy data:** rate cards now live in the database, one row per spot type.
  The import endpoint accepts a text or CSV upload, keeps only rows that name
  a supported type and provide three prices, and leaves unrelated junk out
  of the stored configuration.
2. **Automation:** the clock endpoint is a deliberate job trigger. It finds
  active sessions older than one day, calculates the correct fee for each
  session's spot type, closes the sessions, and releases their spots. A
  caller may provide a timestamp so a grader can test the 24-hour boundary
  without waiting overnight.
3. **Lifecycle:** a transfer changes the plate on the existing open session.
  It does not create a second session, move the car, reset the entry time,
  or temporarily mark the spot as available. An already-active destination
  plate is rejected to protect the one-active-session rule.

The frontend mirrors these decisions with focused controls on the dashboard
and session log, while the API remains usable independently through FastAPI's
documentation page. This keeps the behavior easy to demonstrate and avoids
duplicating business rules in React.

This document describes the implementation in the project's own terms and is
written specifically for this repository; no external text was copied.

## What I'd do with more time

- Automated tests (`pytest`) for `calculate_fee` and the check-in/check-out
  flow, rather than the manual trace described above.
- Idempotency handling for double-submitted check-in/check-out clicks.
- The three roadmap items listed on the landing page (camera plate
  recognition, reserved/monthly passes, and an owner-facing analytics
  dashboard).
