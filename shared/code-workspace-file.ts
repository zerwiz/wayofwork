/**
 * VS Code / Cursor `.code-workspace` shape: https://code.visualstudio.com/docs/editor/workspaces
 * Shared by the web client and Bun server (`workspace-state` save / load).
 */

export type WorkspaceFolderInput = { label: string; path: string };

export type CodeWorkspaceFolderEntry = { path: string; name?: string };

/** Normalize to forward slashes, no trailing slash (except root "/"). */
function normalizeUnixPath(abs: string): string {
  let s = abs.trim().replace(/\\/g, "/");
  s = s.replace(/\/+/g, "/");
  if (s.length > 1 && s.endsWith("/")) s = s.slice(0, -1);
  return s || "/";
}

function pathBasename(abs: string): string {
  const n = normalizeUnixPath(abs);
  const parts = n.split("/").filter(Boolean);
  return parts.length ? parts[parts.length - 1] : n;
}

/**
 * POSIX-style relative path from directory `fromDirAbs` to path `toAbs`.
 * Both should be absolute; used for same-machine exports aligned with VS Code.
 */
export function unixRelativePath(fromDirAbs: string, toAbs: string): string {
  const from = normalizeUnixPath(fromDirAbs);
  const to = normalizeUnixPath(toAbs);
  const fromParts = from === "/" ? [] : from.split("/").filter(Boolean);
  const toParts = to === "/" ? [] : to.split("/").filter(Boolean);
  let i = 0;
  const max = Math.min(fromParts.length, toParts.length);
  while (i < max && fromParts[i] === toParts[i]) i += 1;
  const up = fromParts.length - i;
  const down = toParts.slice(i);
  const rel = [...Array(up).fill(".."), ...down].join("/");
  return rel || ".";
}

export function buildCodeWorkspacePayload(
  folders: WorkspaceFolderInput[],
  /** Directory that will contain the `.code-workspace` file; `null` → absolute paths only. */
  workspaceFileParentDir: string | null,
): { folders: CodeWorkspaceFolderEntry[] } {
  const out: CodeWorkspaceFolderEntry[] = [];
  const base = workspaceFileParentDir?.trim() ?? null;

  for (const f of folders) {
    const abs = normalizeUnixPath(f.path);
    const path = base ? unixRelativePath(base, abs) : abs;
    const baseName = pathBasename(abs);
    const entry: CodeWorkspaceFolderEntry = { path };
    if (f.label && f.label !== baseName) entry.name = f.label;
    out.push(entry);
  }

  return { folders: out };
}
