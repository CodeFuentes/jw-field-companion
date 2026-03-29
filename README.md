# jw-field-companion

Offline-first desktop and future mobile companion for managing Jehovah's Witnesses field ministry records.

This repository contains the product specification, implementation plan, and application source for a local-first app focused on people, visits, Bible studies, preaching sessions, monthly reporting, backups, and multi-profile support.

## Status

The project is in active Phase 1 setup and implementation.

Current source of truth:
- Product and system requirements: [SPEC.md](./SPEC.md)
- Phase 1 implementation tracking: GitHub Issues and Project board

## Product Summary

`jw-field-companion` is designed as a personal productivity app for ministry record-keeping with an emphasis on:

- Offline-first behavior
- Fast local data access
- Clean, minimal UI
- Safe personal data handling
- Multi-profile support on shared desktop devices
- Reusable React codebase for future mobile support

Phase 1 targets a fully local desktop experience. Cloud sync, authentication, and mobile packaging are planned for later phases.

## Core Capabilities

Planned Phase 1 capabilities include:

- Register and manage people contacted during ministry
- Log visits and revisits
- Create and manage Bible studies
- Record study sessions
- Start and close real-time preaching sessions
- Enter preaching sessions retroactively
- Calculate monthly reportable hours from timestamps
- Add immutable personal notes per person
- Support multiple local profiles on the same machine
- Configure backups and core settings
- View dashboard statistics for ministry activity

## Architecture

### Phase 1

- Desktop shell: Tauri
- Frontend: React + TypeScript
- Styling: Tailwind CSS
- Local database: SQLite via `tauri-plugin-sql`
- Localization: `i18next`

### Future phases

- Sync backend: Supabase
- Mobile packaging: Capacitor

## Design Principles

- Offline-first: all data is stored locally first
- Privacy-conscious: personal data stays on-device in Phase 1
- Clear separation: each user profile has its own SQLite database file
- UTC storage: timestamps are stored in UTC and displayed in local time
- Derived reporting: hours are calculated from recorded timestamps, not stored as a separate numeric field

## Repository Structure

Current repository contents:

```text
docs/
  diagrams/
public/
src/
  components/
  hooks/
  i18n/
    locales/
  lib/
  pages/
  store/
  types/
src-tauri/
README.md
SPEC.md
```

## Documentation

- [SPEC.md](./SPEC.md): full system specification, data model, UX rules, business rules, backup strategy, multi-profile behavior, and roadmap

## Development Roadmap

### Phase 1: Local MVP

- Project scaffolding with Tauri + React + TypeScript
- SQLite schema and initialization
- Profile selection and onboarding
- PIN protection
- Person, visit, study, and session workflows
- Dashboard and settings
- Local backup/export support

### Phase 2

- Cloud sync with Supabase
- Authentication
- Mobile app packaging

### Phase 3+

- Maps and territory planning
- Advanced analytics
- Smarter search and suggestions
- Accessibility and quality-of-life improvements

## Getting Started

### Tech stack used today

- Node.js `22.18.0` tested locally
- npm `10.9.3` tested locally
- Rust stable toolchain
- Tauri `2.x`
- React `19`
- TypeScript `5`
- Vite `8`

### Prerequisites

Install these before trying to run the project:

- Node.js 20+ or 22 LTS recommended
- npm
- Rust stable via `rustup`
- Microsoft Visual Studio Build Tools with C++ support on Windows

Optional but useful:

- GitHub CLI

### Windows setup checklist

1. Install Node.js.
2. Install Rust using [rustup](https://rustup.rs/).
3. Install Visual Studio Build Tools and include the C++ toolchain.
4. Open a new terminal after installation.
5. Verify the toolchain:

```powershell
node -v
npm -v
cargo -V
rustc -V
```

If `cargo check` or `npm run tauri:dev` fails with `link.exe not found`, Visual Studio C++ build tools are missing or not available in the current shell.

### Clone the repository

```bash
git clone https://github.com/CodeFuentes/jw-field-companion.git
cd jw-field-companion
```

### Install dependencies

```bash
npm install
```

### Run the frontend only

This starts the Vite development server.

```bash
npm run dev
```

Default local URL:

```text
http://localhost:1420
```

### Run the desktop app with Tauri

This starts the Vite dev server and the Tauri desktop shell together.

```bash
npm run tauri:dev
```

### Build the frontend

```bash
npm run build
```

### Build the desktop app

```bash
npm run tauri:build
```

### Lint the project

```bash
npm run lint
```

## Developer Workflow

Recommended day-to-day workflow:

1. Pull the latest changes.
2. Install dependencies if `package-lock.json` changed.
3. Run `npm run lint`.
4. Run `npm run build`.
5. Run `npm run tauri:dev` when working on desktop-integrated features.

Example:

```bash
git pull
npm install
npm run lint
npm run build
npm run tauri:dev
```

## Available Scripts

- `npm run dev`: start the Vite dev server
- `npm run build`: type-check and build the frontend
- `npm run lint`: run ESLint
- `npm run preview`: preview the production frontend build
- `npm run tauri`: access the Tauri CLI through npm scripts
- `npm run tauri:dev`: run the desktop app in development
- `npm run tauri:build`: create a desktop production build

## Troubleshooting

### `node` or `npm` is not recognized

- Open a fresh terminal session
- If you use `nvm-windows`, run `nvm use <version>`
- Verify with `node -v` and `npm -v`

### `cargo` is not recognized

- Reopen the terminal after installing Rust
- Verify that Rust was installed with `rustup`
- Check with:

```powershell
cargo -V
rustc -V
```

### `link.exe` not found

This usually means the Windows C++ build tools required by Rust/Tauri are not installed or are not available in the current terminal.

Install:

- Visual Studio Build Tools
- Desktop development with C++

Then open a new terminal and retry:

```powershell
cargo check
npm run tauri:dev
```

### Tauri fails but the web app works

- Run `npm run build` first to confirm the frontend is healthy
- Run `cargo check` inside `src-tauri` to isolate Rust-side issues
- Confirm Tauri prerequisites are installed for your OS

## Data, Privacy, and Backups

Phase 1 is designed to keep data local by default.

- Data is stored in local SQLite databases
- Each profile has a separate database file
- Automatic system backups are always enabled
- Optional personal backup directory can be configured by the user
- Export support is planned for JSON and CSV

This application manages personal ministry records, so careful handling of local data, backup rotation, and clear destructive-action confirmations are part of the product scope from the beginning.

## Issue Tracking

Implementation is organized through GitHub Issues and the GitHub Project board.

Current Phase 1 issue categories:

- Setup
- Multi-profile, onboarding, and PIN
- Persons
- Visits
- Studies and study sessions
- Preaching sessions
- Dashboard
- Edit/delete flows and settings

## Contribution Guidelines

Until the codebase is scaffolded, contribution guidance is lightweight:

- Use `SPEC.md` as the source of truth
- Keep documentation, issue descriptions, and code comments in English
- Keep UI copy in neutral Spanish unless the feature specifically concerns localization
- Prefer small, issue-focused changes
- Update the specification when requirements change

More detailed contribution, branching, testing, and release guidance will be added as the repository matures.

## Release and Distribution

Planned product characteristics:

- Lightweight native desktop installer via Tauri
- Offline usability without a required backend
- Future cross-device sync as an optional enhancement

Versioning, packaging, and distribution notes will be documented once the first runnable build exists.

## Disclaimer

This application is independent and is not affiliated with, sponsored by, or approved by Jehovah's Witnesses or the Watch Tower Bible and Tract Society.

## License

License terms have not been published yet.
