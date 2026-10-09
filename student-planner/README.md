# Student Life Planner

A personal planner for a TU Dublin student: classes, work shifts, travel, assignments and free time.
Works in any modern browser on **Windows** and **iPhone**, and can be installed like an app (PWA).

> **Status: MVP (version 0.1).** Data is saved **only in the browser on the current device**.
> Sync between iPhone and Windows is **not implemented yet** (see [docs/SUPABASE.md](docs/SUPABASE.md)).
> Until then, use *Settings → Export backup / Import backup* to move data between devices.

## What it can do

| Screen | Features |
| --- | --- |
| **Today** | Current date & Dublin time, next class/shift, when to start getting ready, when to leave home, countdown, next assignment, free hours today, all of today's events in order with lateness/overlap warnings |
| **Schedule** | Weekly calendar, add/edit/delete classes, work shifts and other events, daily/weekly repeats (e.g. every 2 weeks on Mon+Wed, until a date), skip a single date, travel time + extra buffer per event, conflict warning before saving |
| **Tasks** | Assignments with title, module, deadline, priority, estimated hours, status, notes and a checklist |
| **Deadlines** | Open assignments grouped into Overdue / within 24 h / within 3 days / later |
| **Settings** | English / Russian, light / dark / system theme, default travel times, free-time window, export / import / delete data |

### How the times are calculated

- **Leave home** = event start − travel time − extra buffer.
- **Start getting ready** = leave time − "time to get ready" (Settings).
- **Between two events**: if the location is the same (same text), no travel is needed; otherwise the
  travel time + buffer of the *next* event is used. You get a warning when the gap is too short
  (**risk of being late**), less than 15 minutes spare (**tight**), or events **overlap**.
- **Free time** = the day window (default 08:00–22:00) minus every event from "leave home" until its end,
  minus the trip home after the last event.
- All times use **Irish time (Europe/Dublin)**, including the clock changes in March and October.
  A weekly 09:00 lecture stays at 09:00 after the change; a night shift on the October change night
  lasts one hour longer, as in real life.
- Travel times are entered **by you**. No real bus/Luas/DART data is used yet.

## For beginners: how to run it on your Windows computer

You only need to do steps 1–3 once.

1. **Install Node.js** (the engine that runs the tools): go to <https://nodejs.org>, download the
   **LTS** version for Windows, run the installer and click *Next* until it finishes.
2. **Get the code**: on the GitHub page of this repository click **Code → Download ZIP**, then unzip it
   (right-click → *Extract All*). Or, if you have Git: `git clone <repository URL>`.
3. **Install the project's libraries**: open the `student-planner` folder in File Explorer, click the
   address bar, type `cmd` and press Enter. A black window (terminal) opens in that folder. Type:

   ```bash
   npm install
   ```

4. **Start the app**:

   ```bash
   npm run dev
   ```

   The terminal shows something like `Local: http://localhost:5173/`. Open that address in
   Chrome or Edge. Leave the terminal window open while you use the app; press `Ctrl + C` to stop it.

### Other useful commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the app for development (auto-refreshes when code changes) |
| `npm test` | Runs the automatic tests (time calculations, DST, conflicts, saving) |
| `npm run lint` | Checks the code for common mistakes |
| `npm run build` | Creates the optimised production version in the `dist` folder |
| `npm run preview` | Serves the production version at `http://localhost:4173/` |
| `npm run check` | lint + tests + build in one go |

## Opening it on your iPhone

### Option A — quick test on the same Wi-Fi

1. Your computer and iPhone must be on the **same Wi-Fi** network.
2. Run `npm run dev` on the computer. The terminal also shows a line like
   `Network: http://192.168.1.23:5173/`.
3. Type that address into **Safari** on the iPhone.
4. If it does not open, allow Node.js through **Windows Defender Firewall** (Windows usually asks the
   first time — choose *Private networks*).

Note: in this mode the iPhone has its **own separate copy** of the data, and offline/install features
are limited because the address is not HTTPS.

### Option B — publish it and install it like an app (recommended)

After publishing (see below) open the **https://** address in Safari → tap **Share** →
**Add to Home Screen**. The planner then opens full-screen with its own icon and works offline.

## Publishing on the internet (free options)

The app is a static website: after `npm run build`, everything is in the `dist` folder.
No server or database is needed for the current version.

- **Netlify Drop** (easiest): run `npm run build`, open <https://app.netlify.com/drop> and drag the
  `dist` folder onto the page. You get an `https://….netlify.app` address.
- **Vercel / Netlify connected to GitHub** (auto-update on every push): import the repository, set
  *Root directory* = `student-planner`, *Build command* = `npm run build`, *Output directory* = `dist`.
- **GitHub Pages**: works as well, because the build uses relative paths (`base: './'`).

Remember: each device/browser keeps its own data until cloud sync is added.

## Data safety

- Every change is saved immediately in the browser (`localStorage`); reloading the page keeps everything.
- The previous version is kept as a backup. If saved data gets damaged, the app restores the backup and
  tells you. Broken data is never deleted silently — a copy is kept under a separate key.
- If saving fails (storage full, private browsing), a red warning is shown.
- The app asks the browser to keep the data "persistent" so it is less likely to be cleaned up.
- **Export a backup regularly** (Settings → Export backup). Clearing Safari/Chrome website data deletes it.
- On iPhone, Safari may delete website data of sites you have not opened for several weeks; an app
  added to the Home Screen is not affected by this rule.

## Project structure

```
student-planner/
├── src/
│   ├── domain/        ← pure logic, fully tested (no UI)
│   │   ├── types.ts         data model
│   │   ├── time.ts          Europe/Dublin time helpers (Luxon)
│   │   ├── recurrence.ts    repeating events → concrete occurrences
│   │   ├── conflicts.ts     overlap detection
│   │   ├── travel.ts        leave / prepare times, lateness risk
│   │   ├── day.ts           free time, next event, deadlines
│   │   └── validation.ts    checks data loaded from storage / backups
│   ├── storage/       ← where data is kept (Repository interface + localStorage)
│   ├── state/         ← app state, automatic saving
│   ├── i18n/          ← English and Russian texts
│   ├── components/    ← reusable UI pieces (forms, cards, navigation, modal)
│   ├── views/         ← the five screens
│   └── index.css      ← design, light/dark themes, mobile & desktop layouts
├── public/            ← icons
├── docs/SUPABASE.md   ← plan for cloud sync
└── vite.config.ts     ← build + PWA settings
```

## Roadmap

1. ✅ MVP: local planner (this version)
2. ⬜ Cloud sync with Supabase (login + sync between iPhone and Windows) — see `docs/SUPABASE.md`
3. ⬜ Notifications ("leave in 10 minutes")
4. ⬜ Real public transport times (TFI / NTA GTFS-Realtime API)
5. ⬜ Import of the TU Dublin timetable (.ics)
