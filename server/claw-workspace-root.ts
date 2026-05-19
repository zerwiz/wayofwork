/**
 * Host-scoped Claw workspace: `.claw/` lives under the Way of Pi product checkout
 * (the repo that contains `apps/wayofwork-ui/`), **not** under the mutable project
 * workspace (`WOP_WORKSPACE` / Open Folder). Relative paths in the UI stay
 * `.claw/…`; the Bun server maps them here.
 *
 * Override root with **`WOP_CLAW_HOST_ROOT`** or **`WOP_PLAYGROUND_ROOT`** (see
 * `docs/WOP_NAMESPACE.md`).
 */
import { dirname, join, normalize, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { isInsideRoot, safeResolveUnderWorkspace } from "./paths";

function thisModuleDir(): string {
	if (typeof import.meta.dirname === "string") return import.meta.dirname;
	return dirname(fileURLToPath(import.meta.url));
}

/** Repo root when running from `apps/wayofwork-ui/server/*.ts` (three hops: server → wayofwork-ui → apps → checkout). */
export function getDefaultWayOfPiRepoRootFromServerLayout(): string {
	return normalize(resolve(join(thisModuleDir(), "..", "..", "..")));
}

/**
 * Way of Pi checkout directory that contains **`.claw/`** (not the `.claw` path itself).
 * **`WOP_CLAW_HOST_ROOT`** wins; else **`WOP_PLAYGROUND_ROOT`**; else inferred layout.
 */
export function getClawHostRepoRoot(): string {
	const a = process.env.WOP_CLAW_HOST_ROOT?.trim();
	if (a) return normalize(resolve(a));
	const b = process.env.WOP_PLAYGROUND_ROOT?.trim();
	if (b) return normalize(resolve(b));
	return getDefaultWayOfPiRepoRootFromServerLayout();
}

/** Absolute path to host **`.claw/`** (e.g. `telegram.json` lives here, not in `workspace/`). */
export function getClawDotDirAbs(): string {
	return normalize(join(getClawHostRepoRoot(), ".claw"));
}

/** Absolute path to **`.claw/workspace/`** — seven scaffold files + `memory/`. */
export function getClawWorkspaceBundleDirAbs(): string {
	return normalize(join(getClawDotDirAbs(), "workspace"));
}

export function isClawWorkspaceRel(rel: string): boolean {
	const n = rel.trim().replace(/^[/\\]+/, "");
	if (!n || n === "." || n.includes("..")) return false;
	return n === ".claw" || n.startsWith(".claw/");
}

/**
 * Pre-`workspace/` layout: the seven agent markdown files lived directly under **`.claw/`**
 * (e.g. `.claw/SOUL.md`). If `rel` is **`.claw/workspace/<single-segment>`** (no nested dirs),
 * return the legacy path **`.claw/<same segment>`** so reads/checks can fall back.
 * Does not map `memory/` subtree paths.
 */
export function clawWorkspaceBundleToLegacyFlatRel(relRaw: string): string | null {
	const rel = relRaw.trim().replace(/^[/\\]+/, "");
	const prefix = ".claw/workspace/";
	if (!rel.startsWith(prefix)) return null;
	const rest = rel.slice(prefix.length);
	if (!rest || rest.includes("/") || rest.includes("..")) return null;
	if (rest === "memory") return null;
	return `.claw/${rest}`;
}

/** Resolve `.claw` / `.claw/…` under the host repo root; returns `null` if unsafe or not under `.claw/`. */
export function resolveClawWorkspaceAbs(relRaw: string): string | null {
	const n = relRaw.trim().replace(/^[/\\]+/, "");
	if (!isClawWorkspaceRel(n)) return null;
	const host = getClawHostRepoRoot();
	const abs = normalize(resolve(join(host, n)));
	if (!isInsideRoot(host, abs)) return null;
	const relFromHost = relative(host, abs).replace(/\\/g, "/");
	if (relFromHost !== ".claw" && !relFromHost.startsWith(".claw/")) return null;
	return abs;
}

/** Workspace-jailed paths, except `.claw/…` which resolves on the Way of Pi host checkout. */
export function resolveWorkspaceOrClawAbs(relRaw: string): string | null {
	const rel = relRaw.trim().replace(/^[/\\]+/, "");
	if (!rel || rel === "." || rel.includes("..")) return null;
	if (isClawWorkspaceRel(rel)) return resolveClawWorkspaceAbs(rel);
	return safeResolveUnderWorkspace(rel);
}
