import { existsSync, readFileSync, statSync } from "node:fs";
import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { basename as posixBasename, join as posixJoin } from "node:path/posix";
import { json } from "../utils";
import {
	clawWorkspaceBundleToLegacyFlatRel,
	resolveWorkspaceOrClawAbs,
} from "../claw-workspace-root";
import { getPrimaryWorkspacePath } from "../workspace-state";
import { MAX_FILE_BYTES } from "../paths";
import { imageMimeFromPath } from "../workspace-file-mime";
import { buildWorkspaceTree } from "../tree";
import { broadcastToolLog } from "../tool-log-broadcast";
import { workspaceSwitchAllowed, getFrozenInitialWorkspacePath, listWorkspaceFolders } from "../workspace-state";
import type { Router } from "../router";

export function registerFileSystemRoutes(router: Router) {
	router.get("/api/tree", async (_req, _params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		try {
			const { root, nodes, folders, git } = await buildWorkspaceTree();
			return json({
				root,
				nodes,
				folders,
				git,
				switchAllowed: workspaceSwitchAllowed(),
				initialRoot: getFrozenInitialWorkspacePath(),
			});
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: message }, 500);
		}
	});

	router.get("/api/file", async (req, _params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		const url = new URL(req.url);
		const rel = url.searchParams.get("path") || "";
		const relNorm = rel.trim();
		let abs = resolveWorkspaceOrClawAbs(relNorm);
		if (!abs) return json({ error: "Invalid path" }, 400);
		let readRel = relNorm;
		let st: Awaited<ReturnType<typeof stat>>;
		try {
			st = await stat(abs);
		} catch {
			const legRel = clawWorkspaceBundleToLegacyFlatRel(relNorm);
			if (!legRel) {
				return json({ error: "Not found" }, 404);
			}
			const legAbs = resolveWorkspaceOrClawAbs(legRel);
			if (!legAbs) return json({ error: "Not found" }, 404);
			try {
				st = await stat(legAbs);
				readRel = legRel;
				abs = legAbs;
			} catch {
				return json({ error: "Not found" }, 404);
			}
		}
		try {
			if (!st.isFile()) return json({ error: "Not a file" }, 400);
			if (st.size > MAX_FILE_BYTES) return json({ error: "File too large for editor" }, 413);
			const imageMime = imageMimeFromPath(readRel);
			if (imageMime) {
				const buf = await readFile(abs);
				broadcastToolLog("INFO", "read", `read ${readRel} (image, ${buf.length} bytes)`);
				return json({ path: readRel, encoding: "base64", mimeType: imageMime, content: buf.toString("base64") });
			}
			const buf = await readFile(abs);
			if (buf.includes(0)) {
				broadcastToolLog("INFO", "read", `read ${readRel} (binary, ${buf.length} bytes)`);
				return json({ path: readRel, encoding: "base64", mimeType: "application/octet-stream", content: buf.toString("base64") });
			}
			broadcastToolLog("INFO", "read", `read ${readRel} (${buf.length} chars utf8)`);
			return json({ path: readRel, content: buf.toString("utf8") });
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: message }, 404);
		}
	});

	router.put("/api/file", async (req, _params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		let body: { path?: string; content?: string; encoding?: string };
		try {
			body = (await req.json()) as { path?: string; content?: string; encoding?: string };
		} catch {
			return json({ error: "Invalid JSON" }, 400);
		}
		const rel = body.path || "";
		const abs = resolveWorkspaceOrClawAbs(rel);
		if (!abs) return json({ error: "Invalid path" }, 400);
		const raw = body.content ?? "";
		try {
			await mkdir(dirname(abs), { recursive: true });
			if (body.encoding === "base64") {
				let buf: Buffer;
				try {
					buf = Buffer.from(raw, "base64");
				} catch {
					return json({ error: "Invalid base64" }, 400);
				}
				if (buf.length > MAX_FILE_BYTES) return json({ error: "Content too large" }, 413);
				await writeFile(abs, buf);
				broadcastToolLog("INFO", "write", `write ${rel} (binary, ${buf.length} bytes)`);
			} else {
				if (Buffer.byteLength(raw, "utf8") > MAX_FILE_BYTES) return json({ error: "Content too large" }, 413);
				await writeFile(abs, raw, "utf8");
				broadcastToolLog("INFO", "write", `write ${rel} (${Buffer.byteLength(raw, "utf8")} bytes utf8)`);
			}
			return json({ ok: true, path: rel });
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: message }, 500);
		}
	});

	router.post("/api/fs/move", async (req, _params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		let body: { from?: string; toDir?: string };
		try {
			body = (await req.json()) as { from?: string; toDir?: string };
		} catch {
			return json({ error: "Invalid JSON" }, 400);
		}
		const fromRel = String(body.from ?? "").trim().replace(/^[/\\]+/, "");
		const toDirRaw = body.toDir;
		const toDirRel = typeof toDirRaw === "string" ? toDirRaw.trim().replace(/^[/\\]+/, "").replace(/[/\\]+$/, "") : "";
		if (!fromRel || fromRel.includes("..")) return json({ error: "Invalid from path" }, 400);
		if (toDirRel.includes("..")) return json({ error: "Invalid toDir" }, 400);
		if (listWorkspaceFolders().length > 1 && !toDirRel) {
			return json({ error: "Drop onto a folder (multi-root workspace has no single root)." }, 400);
		}
		const fromAbs = resolveWorkspaceOrClawAbs(fromRel);
		if (!fromAbs) return json({ error: "Invalid from path" }, 400);
		let stFrom: Awaited<ReturnType<typeof stat>>;
		try {
			stFrom = await stat(fromAbs);
		} catch {
			return json({ error: "Source not found" }, 404);
		}
		if (!stFrom.isFile()) return json({ error: "Only files can be moved from the explorer" }, 400);
		const destRel = toDirRel ? posixJoin(toDirRel, posixBasename(fromRel)) : posixBasename(fromRel);
		const normFrom = fromRel.replace(/\/+$/, "");
		const normDest = destRel.replace(/\/+$/, "");
		if (normDest === normFrom) return json({ error: "Already in that folder" }, 400);
		const destAbs = resolveWorkspaceOrClawAbs(destRel);
		if (!destAbs) return json({ error: "Invalid destination" }, 400);
		if (toDirRel) {
			const toDirAbs = resolveWorkspaceOrClawAbs(toDirRel);
			if (!toDirAbs) return json({ error: "Invalid folder" }, 400);
			let stDir: Awaited<ReturnType<typeof stat>>;
			try {
				stDir = await stat(toDirAbs);
			} catch {
				return json({ error: "Folder not found" }, 404);
			}
			if (!stDir.isDirectory()) return json({ error: "Target is not a folder" }, 400);
		}
		if (existsSync(destAbs)) return json({ error: "A file with that name already exists in the target folder" }, 409);
		try {
			await rename(fromAbs, destAbs);
			broadcastToolLog("INFO", "mv", `mv ${fromRel} → ${destRel}`);
			return json({ ok: true, to: destRel });
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: message }, 500);
		}
	});

	router.post("/api/fs/entry", async (req, _params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		let body: { path?: string; kind?: string };
		try {
			body = (await req.json()) as { path?: string; kind?: string };
		} catch {
			return json({ error: "Invalid JSON" }, 400);
		}
		const rel = String(body.path ?? "").trim().replace(/^[/\\]+/, "");
		const kind = body.kind === "dir" ? "dir" : body.kind === "file" ? "file" : "";
		if (!rel || rel === "." || rel.includes("..")) return json({ error: "Invalid path" }, 400);
		if (kind !== "file" && kind !== "dir") return json({ error: 'kind must be "file" or "dir"' }, 400);
		const abs = resolveWorkspaceOrClawAbs(rel);
		if (!abs) return json({ error: "Invalid path" }, 400);
		if (existsSync(abs)) return json({ error: "Path already exists" }, 409);
		try {
			if (kind === "dir") {
				await mkdir(abs, { recursive: true });
				broadcastToolLog("INFO", "mkdir", `mkdir ${rel}`);
			} else {
				await mkdir(dirname(abs), { recursive: true });
				await writeFile(abs, "", "utf8");
				broadcastToolLog("INFO", "write", `touch ${rel}`);
			}
			return json({ ok: true, path: rel });
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: message }, 500);
		}
	});

	router.post("/api/fs/delete", async (req, _params, auth) => {
		if (!auth) return json({ error: "Unauthorized" }, 401);
		let body: { path?: string };
		try {
			body = (await req.json()) as { path?: string };
		} catch {
			return json({ error: "Invalid JSON" }, 400);
		}
		const rel = String(body.path ?? "").trim().replace(/^[/\\]+/, "");
		if (!rel || rel === "." || rel.includes("..")) return json({ error: "Invalid path" }, 400);
		const abs = resolveWorkspaceOrClawAbs(rel);
		if (!abs) return json({ error: "Invalid path" }, 400);
		try {
			await rm(abs, { recursive: true, force: true });
			broadcastToolLog("INFO", "rm", `rm ${rel}`);
			return json({ ok: true as const, path: rel });
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			return json({ error: message }, 500);
		}
	});
}
