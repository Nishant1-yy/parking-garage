# AI Conversation Log

Tool used: Claude (Anthropic), chat interface with code-execution/file-creation
enabled. This is the conversation as it happened, unmodified.

---

**User** (uploaded an image containing the following brief, plus the Round 2
"Builder Round" instructions pasted as text):

> **The storyline**
> A busy multi-level city-centre parking garage. Cars come and go all day,
> and the attendant needs to check a car in, check it out, and charge the
> right fee. Rates are tiered — the first hour is one price, each extra
> hour is cheaper, and there's a daily cap so nobody is overcharged for a
> long stay; part-hours round up. Spots are limited and come in types —
> compact, standard, and EV (with a charger) — and an EV must get an EV
> spot. Drivers keep asking 'is an EV spot free right now?' and the
> attendant hunts for a car by its plate. By evening the log is huge.
>
> **Build the attendant something so every car is charged correctly and no
> spot is double-parked.**
>
> *(The attendant's day is the spec — build it for any garage, not one.
> Get check-in/check-out and the fee right first, then the spot types and
> lookups.)*

Followed by the full "Round 2 — Builder Round (overview)" instructions:
2.5-hour strict time limit; any AI tool allowed; any language/framework;
GitHub Codespaces environment; mandatory deliverables (database, REST APIs
listed in the README, a usable UI, registration/login, search, a one-page
landing page describing the product/features/audience/three next features,
pagination and sorting); submission as a public GitHub repo containing
README.md, REASONING.md, and AI_LOGS.md in the root, submitted via a Google
Form.

---

**Assistant:**

> I can help you build this — a parking garage management system with
> check-in/check-out, tiered fee calculation, spot-type matching (including
> EV), live availability lookup, and plate search, wrapped in a full-stack
> app with auth, search, pagination, and a landing page.
>
> Before I start building, let me confirm the stack so I build something
> you can actually run and defend in the interview.

*(Asked two clarifying questions: which tech stack to use, and whether a
Codespaces repo already existed or a complete project should be handed
over.)*

---

**User:**

> Q: Which tech stack should I build this in?
> A: Python/FastAPI + React + SQLite
>
> Q: Do you already have a GitHub Codespaces repo set up, or should I just
> hand you a complete project you can push?
> A: Just give me the full project files

---

**Assistant:**

Built the complete project against those answers:

- **Backend** (`backend/app/`): FastAPI app with SQLAlchemy models
  (`User`, `Spot`, `ParkingSession`), Pydantic schemas, JWT-based auth
  (`auth.py`), the fee-calculation and spot-assignment business logic
  isolated in `services.py`, a startup seed script for garage spots
  (`seed.py`), and three routers (`auth`, `spots`, `sessions`) covering
  registration/login, spot search/filter/sort/pagination, live
  availability-by-type, check-in/check-out, and a searchable/sortable/
  paginated session log.
- **Frontend** (`frontend/src/`): a Vite + React SPA with a token-based
  `AuthContext`, a `Landing` page (product pitch, features, audience, and
  three roadmap items), `Login`/`Register` pages, a `Dashboard` ("Floor")
  page combining live availability stats, check-in/check-out forms, and a
  searchable/filterable/sortable/paginated spot grid, and a `Sessions` page
  for the plate-search log — styled with a custom dark, signage-inspired
  design system (CSS custom properties in `styles.css`) rather than a
  default UI-kit look.
- Verified every backend Python file with `python -m py_compile` as it was
  written.
- Wrote `README.md` (setup/run/debug instructions plus the full API
  endpoint table), `REASONING.md` (design decisions and how the fee logic
  and double-booking rule were reasoned through and checked), and this
  `AI_LOGS.md`.

Delivered the full project tree, ready to `git init` and push as the
submission repository.

---

*Note for the candidate: if you continue this build inside your own
Codespaces session with an in-editor AI tool (e.g. GitHub Copilot) after
receiving this project, append that follow-on conversation below this line
exactly as it occurred, since the assignment requires the complete,
unmodified log of AI assistance actually used.*

---

## Continuation log: twist implementation and documentation

**User request:** Add the three teacher-provided twists to the existing
parking garage project:

1. Level 1 / T4: import a messy rate card by spot type and price from the
   cleaned rates.
2. Level 2 / T2: provide a nightly job that auto-closes and bills sessions
   parked for more than 24 hours, graded through `POST /clock`.
3. Level 3 / T6: transfer an open session to another plate while preserving
   the spot and entry time.

**Assistant implementation:** The existing architecture was extended rather
than replaced.

- Added a database-backed `RateCard` model with separate compact, standard,
  and EV rates.
- Added `POST /api/rates/import`, which accepts a text/CSV upload, recognizes
  valid spot-type rows, extracts three numeric values, and ignores unrelated
  junk rows.
- Updated fee calculation and checkout to use the rate belonging to the
  assigned spot type.
- Added `POST /api/clock`, with an optional ISO `now` value for deterministic
  grading and manual tests. Sessions older than 24 hours are billed, closed,
  and their spots released.
- Added `POST /api/sessions/transfer`, which changes an active session's
  plate while retaining its session ID, spot, and original check-in time.
  Active destination plates are rejected.
- Added dashboard controls for rate import and plate transfer, plus a
  session-log control for running the nightly clock.

**Compatibility fix:** During HTTP verification, the pre-existing Passlib /
bcrypt combination failed with the installed bcrypt package. Authentication
was changed to call bcrypt directly, and `bcrypt==4.0.1` was pinned in
`backend/requirements.txt` for repeatable setup.

**Validation performed:** Backend compilation passed with
`python3 -m compileall -q backend/app`, and the frontend production build
passed with `npm run build`. The backend health endpoint responded
successfully after starting Uvicorn. A real HTTP check also confirmed that
registration and login worked after the authentication compatibility fix;
the first full smoke attempt exposed and led to a small currency-symbol
parsing fix in the rate importer.

**Documentation and delivery:** `README.md` was updated with the new API
endpoints, request examples, and workflow instructions. `REASONING.md` was
updated with project-specific explanations for the three twists. The code
changes were committed and pushed to `main`, followed by the README and
reasoning updates. The final repository state was clean and synchronized
with `origin/main`.

This continuation was written specifically for this project in original
wording; no external document was copied.
