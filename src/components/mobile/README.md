# Mobile shell (`?shell=mobile`)

Touch-first layouts for the current **`uiMode`** (Claw / Simple / Technical). Same **`/api`**, **`/ws`**, and **`useWayOfPiSession(surfaceId)`** as desktop — mobile only changes presentation.

## Layout

| Path | Role |
|------|------|
| **`chrome/MobileChrome.tsx`** | Shared top bar: title, workspace hint, **Desktop** escape (safe-area). |
| **`claw/ClawMobileTabBar.tsx`** | Claw bottom nav (Mission, Chat, …). |
| **`simple/SimpleMobileTabBar.tsx`** | Simple bottom nav (Chat, Team, models, projects, help, settings). |
| **`technical/MobileTechnicalShell.tsx`** | Technical placeholder until Track 3. |
| **`useShellMobile.ts`** | **`?shell=mobile`**, **`/m`**, **`localStorage`** `wayofpi.shell.mobile`, URL sync. |
| **`index.ts`** | Barrel: import from **`../mobile`** or **`./components/mobile`**. |

**`App.tsx`** gates on **`useShellMobile()`** — **Claw** uses **`ClawApp`** **`layoutVariant="mobile"`**; **Simple** uses **`SimpleApp`** **`layoutVariant="mobile"`** plus **`MobileChrome`** instead of **`MenuBar`**. See **[docs/WOP_MOBILE_UI_PLAN.md](../../../docs/WOP_MOBILE_UI_PLAN.md)**.

## Entry

- Query: **`?shell=mobile`** (or **`?shell=desktop`** to clear).
- Path: **`/m`** (SPA) implies mobile until you leave via **Desktop**.

**Last updated:** 2026-04-12
