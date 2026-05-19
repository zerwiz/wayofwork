/** Cursor/VS Code-style `launch.json` snippet ids for **Run → Add Configuration…**. */
export type LaunchSnippetId = "node-launch" | "node-attach" | "bun-launch" | "python-current-file";

export const LAUNCH_SNIPPET_ORDER: LaunchSnippetId[] = [
	"node-launch",
	"bun-launch",
	"python-current-file",
	"node-attach",
];

export const LAUNCH_SNIPPET_LABELS: Record<LaunchSnippetId, string> = {
	"node-launch": "Node.js — launch program",
	"bun-launch": "Bun — launch script",
	"python-current-file": "Python — current file (debugpy)",
	"node-attach": "Node.js — attach to port",
};

const SNIPPET_DEFAULT_NAMES: Record<LaunchSnippetId, string> = {
	"node-launch": "Launch Program",
	"bun-launch": "Launch Bun",
	"python-current-file": "Python: Current File",
	"node-attach": "Attach to Node",
};

const SNIPPET_BODIES: Record<LaunchSnippetId, Record<string, unknown>> = {
	"node-launch": {
		type: "node",
		request: "launch",
		skipFiles: ["<node_internals>/**"],
		program: "${workspaceFolder}/index.js",
	},
	"bun-launch": {
		type: "bun",
		request: "launch",
		program: "${workspaceFolder}/index.ts",
		cwd: "${workspaceFolder}",
		stopOnEntry: false,
	},
	"python-current-file": {
		type: "debugpy",
		request: "launch",
		program: "${file}",
		console: "integratedTerminal",
	},
	"node-attach": {
		type: "node",
		request: "attach",
		port: 9229,
		restart: true,
		localRoot: "${workspaceFolder}",
		remoteRoot: ".",
	},
};

function uniqueConfigName(base: string, taken: Set<string>): string {
	if (!taken.has(base)) return base;
	let i = 2;
	while (taken.has(`${base} (${i})`)) i += 1;
	return `${base} (${i})`;
}

function collectConfigNames(configurations: unknown[]): Set<string> {
	const s = new Set<string>();
	for (const c of configurations) {
		if (c && typeof c === "object" && "name" in c) {
			const n = (c as { name: unknown }).name;
			if (typeof n === "string" && n.trim()) s.add(n);
		}
	}
	return s;
}

/** Append a configuration block; returns formatted JSON text (2-space indent + trailing newline). */
export function mergeSnippetIntoLaunchJson(fileText: string, id: LaunchSnippetId): string {
	let doc: { version?: string; configurations?: unknown[] };
	try {
		doc = JSON.parse(fileText.trim() || "{}") as { version?: string; configurations?: unknown[] };
	} catch {
		doc = { version: "0.2.0", configurations: [] };
	}
	if (!doc || typeof doc !== "object") doc = { version: "0.2.0", configurations: [] };
	if (doc.version == null || typeof doc.version !== "string") doc.version = "0.2.0";
	if (!Array.isArray(doc.configurations)) doc.configurations = [];

	const taken = collectConfigNames(doc.configurations);
	const baseName = SNIPPET_DEFAULT_NAMES[id];
	const name = uniqueConfigName(baseName, taken);
	const body = { ...SNIPPET_BODIES[id], name };
	doc.configurations.push(body);
	return `${JSON.stringify(doc, null, 2)}\n`;
}
