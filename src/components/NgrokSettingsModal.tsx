import { Check, Copy, ExternalLink, Globe, RefreshCw, X } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { DockSplitHandle } from "./DockSplitHandle";
import { EmbeddedTerminal } from "./EmbeddedTerminal";
import { sendTerminalInput } from "../utils/terminalInputBridge";

/** Persisted width of the right “Terminal” column (md+ layout). */
const NGROK_MODAL_TERMINAL_SPLIT_KEY = "wop-ngrok-settings-terminal-width-px";
const NGROK_MODAL_TERMINAL_DEFAULT_PX = 560;
const NGROK_MODAL_TERMINAL_MIN_PX = 280;
const NGROK_MODAL_MAIN_MIN_PX = 260;

function readSavedTerminalSplitPx(): number {
	if (typeof window === "undefined") return NGROK_MODAL_TERMINAL_DEFAULT_PX;
	const n = Number.parseInt(window.localStorage.getItem(NGROK_MODAL_TERMINAL_SPLIT_KEY) ?? "", 10);
	return Number.isFinite(n) && n >= NGROK_MODAL_TERMINAL_MIN_PX ? n : NGROK_MODAL_TERMINAL_DEFAULT_PX;
}

const NGROK_MODAL_TERMINAL_VISIBLE_KEY = "wop-ngrok-settings-terminal-visible";

function readTerminalPanelVisible(): boolean {
	if (typeof window === "undefined") return true;
	try {
		const v = window.localStorage.getItem(NGROK_MODAL_TERMINAL_VISIBLE_KEY);
		return v !== "0" && v !== "false";
	} catch {
		return true;
	}
}

function Mono({ children, dark }: { children: React.ReactNode; dark: boolean }) {
	return (
		<code
			className={`rounded px-1 py-0.5 font-mono text-[11px] ${
				dark ? "bg-[#1e1e1e] text-[#d4d4d4]" : "bg-[#f3f3f3] text-[#333]"
			}`}
		>
			{children}
		</code>
	);
}

type ShareHints = {
	ok: true;
	lanIPv4: string | null;
	lanUrl: string | null;
	vitePort: number;
	ngrokPublicUrl: string | null;
};

type NgrokResolvedSource = "WOP_NGROK_BINARY" | "PATH" | "bundled" | null;

type NgrokTunnelGetJson = {
	ok: true;
	allowControl: boolean;
	wopManagedRunning: boolean;
	pid: number | null;
	tunnelPort: number;
	publicUrl: string | null;
	ngrokOnPath: boolean;
	ngrokVersionLine: string | null;
	ngrokWhichPath: string | null;
	ngrokResolvedSource: NgrokResolvedSource;
	/** Server: TCP probe on 127.0.0.1:tunnelPort (Vite etc.); omitted on older Bun = assume true */
	backendListening?: boolean;
	/** Local ngrok inspector base URL ending with / */
	inspectorUrl?: string;
	/** Server can run bun/npm install in apps/wayofwork-ui to fetch optional ngrok */
	installBundledAllowed?: boolean;
	/** Dev: save authtoken from UI (not tied to WOP_ALLOW_NGROK_SPAWN) */
	authtokenSaveAllowed?: boolean;
};

type TunnelGateGetJson = {
	ok: true;
	wopHome: string;
	configPath: string;
	loginEnabled: boolean;
	configured: boolean;
	username: string | null;
	publicHostHint: string;
};

function ngrokSourceDescription(source: NgrokResolvedSource): string | null {
	if (source === "bundled")
		return "Optional bundled agent (npm package ngrok in apps/wayofwork-ui - install deps, or skip ngrok entirely).";
	if (source === "PATH") return "System PATH.";
	if (source === "WOP_NGROK_BINARY") return "WOP_NGROK_BINARY override.";
	return null;
}

function NgrokTunnelControlRow({
	dark,
	loadState,
	allowControl,
	ngrokOnPath,
	wopManagedRunning,
	tunnelPort,
	busy,
	prodMessage,
	backendListening,
	onStartStop,
}: {
	dark: boolean;
	loadState: "loading" | "dev" | "prod";
	allowControl: boolean;
	ngrokOnPath: boolean;
	wopManagedRunning: boolean;
	tunnelPort: number;
	busy: boolean;
	prodMessage: string | null;
	/** When false, block starting the managed tunnel (nothing on 127.0.0.1:tunnelPort) */
	backendListening: boolean;
	onStartStop: () => void;
}) {
	const trackOff = dark ? "bg-[#6f6f6f]" : "bg-[#c8c8c8]";
	const card = dark ? "border-[#3c3c3c] bg-[#1e1e1e]" : "border-[#e5e5e5] bg-[#fafafa]";
	const titleC = dark ? "text-[#cccccc]" : "text-[#111]";
	const desc = dark ? "text-[#858585]" : "text-[#616161]";

	if (loadState === "loading") {
		return (
			<div className={`mb-4 rounded-lg border p-4 ${card}`}>
				<h3 className={`text-sm font-bold ${titleC}`}>3. Tunnel</h3>
				<p className={`mt-1 text-xs leading-relaxed ${desc}`}>Loading tunnel status...</p>
			</div>
		);
	}

	if (loadState === "prod") {
		const pre = dark ? "border-[#3c3c3c] bg-black/40 text-[#d4d4d4]" : "border-[#ddd] bg-[#f8f8f8] text-[#222]";
		return (
			<div className={`mb-4 rounded-lg border p-4 ${card}`}>
				<h3 className={`text-sm font-bold ${titleC}`}>Tunnel API unreachable — no authtoken field or switch yet</h3>
				<p className={`mt-2 text-xs leading-relaxed ${desc}`}>
					{prodMessage ?? "Tunnel control is not available in this environment."}
				</p>
				<p className={`mt-3 text-xs leading-relaxed ${dark ? "text-[#d4d4d4]" : "text-[#333]"}`}>
					<strong className={titleC}>Sections 1–3 (install, authtoken, tunnel on/off)</strong> load only after{" "}
					<Mono dark={dark}>GET /api/dev/ngrok-tunnel</Mono> succeeds. That request goes to the <strong className={titleC}>Way of Pi Bun server</strong> (
					<Mono dark={dark}>WOP_SERVER_PORT</Mono>, default <Mono dark={dark}>3333</Mono>). A <strong className={titleC}>404</strong> usually means the browser is not
					reaching that API (Bun not running, wrong page origin, or a proxy dropping <Mono dark={dark}>/api/dev/*</Mono>).
				</p>
				<ol className={`mt-3 list-decimal space-y-1.5 pl-5 text-xs leading-relaxed ${desc}`}>
					<li>
						Start the API: <Mono dark={dark}>cd apps/wayofwork-ui && bun run server/index.ts</Mono> — or from the repo root run{" "}
						<Mono dark={dark}>./start-wayofwork-ui.sh</Mono> (Vite + Bun).
					</li>
					<li>
						Open the app at <Mono dark={dark}>http://127.0.0.1:{tunnelPort}</Mono> when using Vite dev (proxies <Mono dark={dark}>/api</Mono> to Bun). Electron dev
						uses that by default.
					</li>
					<li>
						Use <strong className={titleC}>Refresh</strong> under “Copy addresses” below, or close this dialog and open{" "}
						<strong className={titleC}>Settings → ngrok</strong> again.
					</li>
				</ol>
				<p className={`mt-4 text-xs font-semibold ${titleC}`}>CLI-only fallback (same machine)</p>
				<pre className={`mt-1 overflow-x-auto rounded border p-2.5 font-mono text-[10px] leading-snug ${pre}`}>
					{`ngrok config add-authtoken YOUR_DASHBOARD_TOKEN
ngrok http ${tunnelPort}`}
				</pre>
				<p className={`mt-2 text-[11px] leading-relaxed ${desc}`}>
					Then open <Mono dark={dark}>http://127.0.0.1:4040</Mono> in a browser on <strong className={titleC}>this computer</strong> (not your phone) to copy the
					public <Mono dark={dark}>https://…</Mono> link. For Bun-only static on <Mono dark={dark}>3333</Mono>, use <Mono dark={dark}>ngrok http 3333</Mono> instead.
				</p>
			</div>
		);
	}

	if (loadState === "dev" && !allowControl) {
		return (
			<div className={`mb-4 rounded-lg border p-4 ${card}`}>
				<h3 className={`text-sm font-bold ${titleC}`}>3. Tunnel</h3>
				<p className={`mt-1 text-xs leading-relaxed ${desc}`}>
					Way of Pi cannot start or stop ngrok from here (<Mono dark={dark}>WOP_ALLOW_NGROK_SPAWN</Mono> is off). You can still save your authtoken in section 2. Start{" "}
					<Mono dark={dark}>ngrok http {tunnelPort}</Mono> yourself on this host (or unset that env), then use{" "}
					<strong className={dark ? "text-[#e0e0e0]" : "text-[#111]"}>Refresh</strong> below for the public URL.
				</p>
			</div>
		);
	}

	if (loadState === "dev" && allowControl && !ngrokOnPath) {
		return (
			<div className={`mb-4 rounded-lg border p-4 ${card}`}>
				<h3 className={`text-sm font-bold ${titleC}`}>3. Tunnel</h3>
				<p className={`mt-1 text-xs leading-relaxed ${desc}`}>
					Run <strong className={dark ? "text-[#e0e0e0]" : "text-[#111]"}>bun install</strong> in <Mono dark={dark}>apps/wayofwork-ui</Mono>, or install
					ngrok on <strong className={dark ? "text-[#e0e0e0]" : "text-[#111]"}>PATH</strong> / set <Mono dark={dark}>WOP_NGROK_BINARY</Mono>, then press{" "}
					<strong className={dark ? "text-[#e0e0e0]" : "text-[#111]"}>Refresh</strong>. When section 1 shows the CLI as ready, start the tunnel here.
				</p>
				<div className="mt-3 flex opacity-50">
					<span
						className={`relative h-6 w-12 shrink-0 rounded-full ${trackOff}`}
						aria-hidden
					>
						<span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white" />
					</span>
					<span className={`ml-3 text-xs ${desc}`}>Start switch unlocks when ngrok is on PATH.</span>
				</div>
			</div>
		);
	}

	return (
		<div
			className={`mb-4 flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between ${card}`}
		>
			<div className="min-w-0 pr-2">
				<h3 className={`text-sm font-bold ${titleC}`}>3. Tunnel</h3>
				<p className={`mt-1 text-xs leading-relaxed ${desc}`}>
					<strong className={dark ? "text-[#e0e0e0]" : "text-[#111]"}>On</strong> - Way of Pi runs{" "}
					<Mono dark={dark}>ngrok http {tunnelPort}</Mono> for this session. <strong className={dark ? "text-[#e0e0e0]" : "text-[#111]"}>Off</strong>{" "}
					- stops only the ngrok process Way of Pi started here; if you started ngrok in another terminal, stop it there (Ctrl+C).
				</p>
			</div>
			<button
				type="button"
				role="switch"
				aria-checked={wopManagedRunning}
				aria-label={wopManagedRunning ? "Stop ngrok tunnel" : "Start ngrok tunnel"}
				disabled={busy || (!wopManagedRunning && !backendListening)}
				title={
					!wopManagedRunning && !backendListening
						? `Start Vite (or your HTTP server) on 127.0.0.1:${tunnelPort} first`
						: undefined
				}
				onClick={onStartStop}
				className={`relative h-6 w-12 shrink-0 rounded-full transition-colors ${
					busy || (!wopManagedRunning && !backendListening) ? "cursor-not-allowed opacity-50" : "cursor-pointer"
				} ${wopManagedRunning ? "bg-[#ea580c]" : trackOff}`}
			>
				<span
					className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${wopManagedRunning ? "right-1" : "left-1"}`}
				/>
			</button>
		</div>
	);
}

function CopyRow({ label, value, dark }: { label: string; value: string; dark: boolean }) {
	const [copied, setCopied] = useState(false);
	const onCopy = useCallback(async () => {
		if (!value) return;
		try {
			await navigator.clipboard.writeText(value);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch {
			/* ignore */
		}
	}, [value]);

	const btn = dark
		? "border-[#454545] bg-[#2d2d2d] text-[#cccccc] hover:bg-[#3c3c3c] disabled:opacity-40"
		: "border-[#ccc] bg-white text-[#222] hover:bg-[#f5f5f5] disabled:opacity-40";

	return (
		<div className="space-y-1">
			<div className={`text-[11px] font-semibold uppercase tracking-wide ${dark ? "text-[#858585]" : "text-[#616161]"}`}>
				{label}
			</div>
			<div className="flex flex-col gap-2 sm:flex-row sm:items-center">
				<input
					readOnly
					value={value}
					className={`min-w-0 flex-1 rounded border px-2 py-2 font-mono text-[11px] ${
						dark ? "border-[#3c3c3c] bg-black/30 text-[#d4d4d4]" : "border-[#ddd] bg-[#f8f8f8] text-[#111]"
					}`}
					onFocus={(e) => e.target.select()}
					aria-label={label}
				/>
				<button
					type="button"
					disabled={!value}
					onClick={() => void onCopy()}
					className={`inline-flex shrink-0 items-center gap-1.5 rounded border px-3 py-2 text-[12px] font-medium ${btn}`}
				>
					{copied ? <Check size={14} className="text-emerald-500" aria-hidden /> : <Copy size={14} aria-hidden />}
					{copied ? "Copied" : "Copy"}
				</button>
			</div>
		</div>
	);
}

/**
 * Settings → ngrok: reach the machine where Bun + Vite run from another network via a temporary public https URL.
 * The server can spawn/stop `ngrok http <tunnelPort>` when allowed; install + authtoken are one-time CLI steps.
 */
export function NgrokSettingsModal({
	open,
	onClose,
	appearanceDark,
	onOpenShareNgrokHelp,
}: {
	open: boolean;
	onClose: () => void;
	appearanceDark: boolean;
	/** Opens Help (How to use → Share with ngrok, or Claw guide → Share with ngrok) and closes this dialog. */
	onOpenShareNgrokHelp: () => void;
}) {
	const overlay = appearanceDark ? "bg-black/55" : "bg-black/35";
	const panel = appearanceDark ? "border-[#454545] bg-[#252526] text-[#cccccc]" : "border-[#e5e5e5] bg-white text-[#333]";
	const sub = appearanceDark ? "text-[#858585]" : "text-[#616161]";
	const helpLinkBtn = appearanceDark
		? "text-[#7dd3fc] decoration-[#7dd3fc]/50 hover:text-[#bae6fd] hover:decoration-[#bae6fd]"
		: "text-[#0369a1] decoration-[#0369a1]/40 hover:text-[#0c4a6e] hover:decoration-[#0c4a6e]";
	const card = appearanceDark ? "border-[#3c3c3c] bg-[#1e1e1e]" : "border-[#e5e5e5] bg-[#fafafa]";
	const borderB = appearanceDark ? "border-[#3c3c3c]" : "border-[#e5e5e5]";
	const pre = appearanceDark ? "border-[#3c3c3c] bg-black/40 text-[#d4d4d4]" : "border-[#ddd] bg-[#f8f8f8] text-[#222]";
	const passwordField = appearanceDark
		? "w-full rounded border border-[#3c3c3c] bg-black/30 px-3 py-2 font-mono text-[12px] text-[#d4d4d4] placeholder:text-[#6b6b6b]"
		: "w-full rounded border border-[#ddd] bg-white px-3 py-2 font-mono text-[12px] text-[#111] placeholder:text-[#999]";
	const primaryBtn = appearanceDark
		? "rounded border border-[#ea580c]/60 bg-[#ea580c]/20 px-3 py-2 text-[12px] font-semibold text-[#fb923c] hover:bg-[#ea580c]/30 disabled:opacity-40"
		: "rounded border border-[#ea580c] bg-[#ea580c] px-3 py-2 text-[12px] font-semibold text-white hover:bg-[#c2410c] disabled:opacity-40";
	const injectChipBtn = appearanceDark
		? "rounded border border-[#454545] bg-[#2d2d2d] px-2 py-1 text-[10px] font-medium leading-tight text-[#d4d4d4] hover:bg-[#3c3c3c]"
		: "rounded border border-[#ccc] bg-white px-2 py-1 text-[10px] font-medium leading-tight text-[#222] hover:bg-[#f5f5f5]";

	const [tunnelStatus, setTunnelStatus] = useState<NgrokTunnelGetJson | null>(null);
	const [tunnelLoadState, setTunnelLoadState] = useState<"loading" | "dev" | "prod">("loading");
	const [tunnelProdMessage, setTunnelProdMessage] = useState<string | null>(null);
	const [hints, setHints] = useState<ShareHints | null>(null);
	const [refreshing, setRefreshing] = useState(false);
	const [hintsError, setHintsError] = useState<string | null>(null);
	const [actionMessage, setActionMessage] = useState<string | null>(null);
	const [actionBusy, setActionBusy] = useState(false);
	const [authtokenDraft, setAuthtokenDraft] = useState("");
	const [configBusy, setConfigBusy] = useState(false);
	const [configMessage, setConfigMessage] = useState<string | null>(null);
	/** Server-side optional **ngrok** package in apps/wayofwork-ui (`install-bundled` / `update-bundled`). */
	const [bundledOpBusy, setBundledOpBusy] = useState<null | "install" | "update">(null);
	const [installMessage, setInstallMessage] = useState<string | null>(null);
	const [gateStatus, setGateStatus] = useState<TunnelGateGetJson | null>(null);
	const [gateLoadError, setGateLoadError] = useState<string | null>(null);
	const [tunnelLoginUser, setTunnelLoginUser] = useState("");
	const [tunnelLoginPass, setTunnelLoginPass] = useState("");
	const [tunnelLoginEnabled, setTunnelLoginEnabled] = useState(false);
	const [gateBusy, setGateBusy] = useState(false);
	const [gateMessage, setGateMessage] = useState<string | null>(null);
	const [injectHint, setInjectHint] = useState<string | null>(null);
	const injectHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const splitRowRef = useRef<HTMLDivElement>(null);
	const [terminalAsidePx, setTerminalAsidePx] = useState(readSavedTerminalSplitPx);
	const [mdSplitLayout, setMdSplitLayout] = useState(
		() => typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches,
	);
	const [terminalPanelVisible, setTerminalPanelVisible] = useState(readTerminalPanelVisible);

	const setTerminalPanelVisiblePersist = useCallback((visible: boolean) => {
		setTerminalPanelVisible(visible);
		try {
			window.localStorage.setItem(NGROK_MODAL_TERMINAL_VISIBLE_KEY, visible ? "1" : "0");
		} catch {
			/* ignore */
		}
	}, []);

	const clampTerminalAsidePx = useCallback((w: number) => {
		const row = splitRowRef.current;
		const handleSlack = 14;
		if (!row) {
			return Math.max(NGROK_MODAL_TERMINAL_MIN_PX, Math.min(w, 1200));
		}
		const max = row.getBoundingClientRect().width - NGROK_MODAL_MAIN_MIN_PX - handleSlack;
		return Math.min(Math.max(NGROK_MODAL_TERMINAL_MIN_PX, w), Math.max(NGROK_MODAL_TERMINAL_MIN_PX, max));
	}, []);

	const onTerminalSplitDelta = useCallback(
		(dx: number) => {
			setTerminalAsidePx((prev) => clampTerminalAsidePx(prev - dx));
		},
		[clampTerminalAsidePx],
	);

	useEffect(() => {
		const mq = window.matchMedia("(min-width: 768px)");
		const fn = () => setMdSplitLayout(mq.matches);
		fn();
		mq.addEventListener("change", fn);
		return () => mq.removeEventListener("change", fn);
	}, []);

	useLayoutEffect(() => {
		if (!open) return;
		const clamp = () => setTerminalAsidePx((w) => clampTerminalAsidePx(w));
		const id = requestAnimationFrame(clamp);
		window.addEventListener("resize", clamp);
		return () => {
			cancelAnimationFrame(id);
			window.removeEventListener("resize", clamp);
		};
	}, [open, clampTerminalAsidePx]);

	useEffect(() => {
		if (!open) return;
		const t = window.setTimeout(() => {
			try {
				window.localStorage.setItem(NGROK_MODAL_TERMINAL_SPLIT_KEY, String(terminalAsidePx));
			} catch {
				/* ignore */
			}
		}, 300);
		return () => window.clearTimeout(t);
	}, [terminalAsidePx, open]);

	const clearInjectHintSoon = useCallback((message: string, ms = 5000) => {
		if (injectHintTimerRef.current) clearTimeout(injectHintTimerRef.current);
		setInjectHint(message);
		injectHintTimerRef.current = setTimeout(() => {
			setInjectHint(null);
			injectHintTimerRef.current = null;
		}, ms);
	}, []);

	useEffect(() => {
		return () => {
			if (injectHintTimerRef.current) clearTimeout(injectHintTimerRef.current);
		};
	}, []);

	const injectIntoTerminal = useCallback(
		(bytes: string) => {
			if (sendTerminalInput(bytes)) {
				if (injectHintTimerRef.current) clearTimeout(injectHintTimerRef.current);
				setInjectHint(null);
				return true;
			}
			clearInjectHintSoon(
				"Could not send — click inside the terminal, wait for a shell prompt, and ensure the server allows terminals (WOP_ALLOW_TERMINAL).",
			);
			return false;
		},
		[clearInjectHintSoon],
	);

	const refreshAll = useCallback(async () => {
		setRefreshing(true);
		setHintsError(null);
		setTunnelLoadState("loading");
		setTunnelProdMessage(null);
		setActionMessage(null);
		setInstallMessage(null);
		setGateLoadError(null);
		setGateMessage(null);

		const tunnelP = fetch("/api/dev/ngrok-tunnel", { headers: { Accept: "application/json" } });
		const hintsP = fetch("/api/dev/share-url-hints", { headers: { Accept: "application/json" } });
		const gateP = fetch("/api/dev/tunnel-gate", { headers: { Accept: "application/json" } });

		const [rTunnel, rHints, rGate] = await Promise.all([tunnelP, hintsP, gateP]);

		if (rTunnel.status === 404) {
			setTunnelStatus(null);
			setTunnelLoadState("prod");
			setTunnelProdMessage(
				"Tunnel API not found (HTTP 404). Ensure the Way of Pi Bun server handles GET /api/dev/ngrok-tunnel (no stale proxy stripping /api/dev/*).",
			);
		} else if (!rTunnel.ok) {
			setTunnelStatus(null);
			setTunnelLoadState("prod");
			setTunnelProdMessage(`Could not read tunnel status (HTTP ${rTunnel.status}).`);
		} else {
			const j = (await rTunnel.json()) as NgrokTunnelGetJson & { ngrokOnPath?: boolean };
			if (j.ok) {
				const insp = typeof j.inspectorUrl === "string" && j.inspectorUrl.startsWith("http") ? j.inspectorUrl : "http://127.0.0.1:4040/";
				setTunnelStatus({
					...j,
					ngrokOnPath: j.ngrokOnPath ?? false,
					ngrokVersionLine: j.ngrokVersionLine ?? null,
					ngrokWhichPath: j.ngrokWhichPath ?? null,
					ngrokResolvedSource: (j.ngrokResolvedSource ?? null) as NgrokResolvedSource,
					installBundledAllowed: j.installBundledAllowed !== false,
					authtokenSaveAllowed: j.authtokenSaveAllowed !== false,
					inspectorUrl: insp.endsWith("/") ? insp : `${insp}/`,
					backendListening: typeof j.backendListening === "boolean" ? j.backendListening : true,
				});
			} else {
				setTunnelStatus(null);
			}
			setTunnelLoadState("dev");
		}

		if (rHints.status === 404) {
			setHints(null);
			if (rTunnel.status === 404 || !rTunnel.ok) {
				setHintsError("Share hints API not found (HTTP 404). Check that GET /api/dev/share-url-hints reaches the Bun server.");
			}
		} else if (!rHints.ok) {
			setHints(null);
			setHintsError(`Could not load LAN hints (HTTP ${rHints.status}).`);
		} else {
			const j = (await rHints.json()) as ShareHints;
			setHints(j.ok ? j : null);
		}

		if (rGate.status === 404) {
			setGateStatus(null);
			setGateLoadError("Tunnel login API not found (HTTP 404). Check that /api/dev/tunnel-gate is proxied to Bun.");
		} else if (!rGate.ok) {
			setGateStatus(null);
			setGateLoadError(`Could not load tunnel login settings (HTTP ${rGate.status}).`);
		} else {
			const g = (await rGate.json()) as TunnelGateGetJson;
			if (g.ok) {
				setGateStatus(g);
				setTunnelLoginUser(g.username ?? "");
				setTunnelLoginEnabled(g.loginEnabled);
				setTunnelLoginPass("");
				setGateLoadError(null);
			} else {
				setGateStatus(null);
				setGateLoadError("Unexpected tunnel login response.");
			}
		}

		setRefreshing(false);
	}, []);

	useEffect(() => {
		if (!open) return;
		setAuthtokenDraft("");
		setConfigMessage(null);
		setInstallMessage(null);
		setGateMessage(null);
		void refreshAll();
	}, [open, refreshAll]);

	const onSaveTunnelGate = useCallback(async () => {
		if (tunnelLoadState !== "dev" || gateBusy) return;
		setGateBusy(true);
		setGateMessage(null);
		try {
			const r = await fetch("/api/dev/tunnel-gate", {
				method: "POST",
				headers: { Accept: "application/json", "Content-Type": "application/json" },
				body: JSON.stringify({
					action: "save",
					enabled: tunnelLoginEnabled,
					username: tunnelLoginUser.trim(),
					password: tunnelLoginPass,
				}),
			});
			const j = (await r.json()) as { ok?: boolean; message?: string };
			setGateMessage(typeof j.message === "string" ? j.message : r.ok ? "Done." : `HTTP ${r.status}`);
			await refreshAll();
		} catch {
			setGateMessage("Request failed (is the Bun server running?)");
		} finally {
			setGateBusy(false);
		}
	}, [tunnelLoadState, gateBusy, tunnelLoginEnabled, tunnelLoginUser, tunnelLoginPass, refreshAll, gateStatus?.configured]);

	const onClearTunnelGate = useCallback(async () => {
		if (tunnelLoadState !== "dev" || gateBusy) return;
		setGateBusy(true);
		setGateMessage(null);
		try {
			const r = await fetch("/api/dev/tunnel-gate", {
				method: "POST",
				headers: { Accept: "application/json", "Content-Type": "application/json" },
				body: JSON.stringify({ action: "clear" }),
			});
			const j = (await r.json()) as { ok?: boolean; message?: string };
			setGateMessage(typeof j.message === "string" ? j.message : r.ok ? "Done." : `HTTP ${r.status}`);
			setTunnelLoginPass("");
			await refreshAll();
		} catch {
			setGateMessage("Request failed (is the Bun server running?)");
		} finally {
			setGateBusy(false);
		}
	}, [tunnelLoadState, gateBusy, refreshAll]);

	const bundledPkgBusy = bundledOpBusy !== null;

	const onInstallBundledNgrok = useCallback(async () => {
		if (tunnelLoadState !== "dev" || bundledPkgBusy || !tunnelStatus?.installBundledAllowed) return;
		setBundledOpBusy("install");
		setInstallMessage(null);
		try {
			const r = await fetch("/api/dev/ngrok-tunnel", {
				method: "POST",
				headers: { Accept: "application/json", "Content-Type": "application/json" },
				body: JSON.stringify({ action: "install-bundled" }),
			});
			const j = (await r.json()) as { ok?: boolean; message?: string };
			setInstallMessage(typeof j.message === "string" ? j.message : r.ok ? "Done." : `HTTP ${r.status}`);
			await refreshAll();
		} catch {
			setInstallMessage("Request failed (is the Bun server running?)");
		} finally {
			setBundledOpBusy(null);
		}
	}, [tunnelLoadState, bundledPkgBusy, tunnelStatus?.installBundledAllowed, refreshAll]);

	const onUpdateBundledNgrok = useCallback(async () => {
		if (tunnelLoadState !== "dev" || bundledPkgBusy || !tunnelStatus?.installBundledAllowed) return;
		setBundledOpBusy("update");
		setInstallMessage(null);
		try {
			const r = await fetch("/api/dev/ngrok-tunnel", {
				method: "POST",
				headers: { Accept: "application/json", "Content-Type": "application/json" },
				body: JSON.stringify({ action: "update-bundled" }),
			});
			const j = (await r.json()) as { ok?: boolean; message?: string };
			setInstallMessage(typeof j.message === "string" ? j.message : r.ok ? "Done." : `HTTP ${r.status}`);
			await refreshAll();
		} catch {
			setInstallMessage("Request failed (is the Bun server running?)");
		} finally {
			setBundledOpBusy(null);
		}
	}, [tunnelLoadState, bundledPkgBusy, tunnelStatus?.installBundledAllowed, refreshAll]);

	const onTunnelToggle = useCallback(async () => {
		if (tunnelLoadState !== "dev" || !tunnelStatus?.allowControl || actionBusy) return;
		const starting = !tunnelStatus.wopManagedRunning;
		if (starting && !tunnelStatus.ngrokOnPath) return;
		setActionBusy(true);
		setActionMessage(null);
		try {
			const action = tunnelStatus.wopManagedRunning ? "stop" : "start";
			const r = await fetch("/api/dev/ngrok-tunnel", {
				method: "POST",
				headers: { Accept: "application/json", "Content-Type": "application/json" },
				body: JSON.stringify({ action }),
			});
			const j = (await r.json()) as { ok?: boolean; message?: string };
			setActionMessage(typeof j.message === "string" ? j.message : r.ok ? "Done." : `HTTP ${r.status}`);
			await refreshAll();
		} catch {
			setActionMessage("Request failed (is the Bun server running?)");
		} finally {
			setActionBusy(false);
		}
	}, [tunnelLoadState, tunnelStatus, actionBusy, refreshAll]);

	const onSaveAuthtoken = useCallback(async () => {
		if (tunnelLoadState !== "dev" || tunnelStatus?.authtokenSaveAllowed === false || configBusy) return;
		const token = authtokenDraft.trim();
		if (!token) return;
		setConfigBusy(true);
		setConfigMessage(null);
		try {
			const r = await fetch("/api/dev/ngrok-tunnel", {
				method: "POST",
				headers: { Accept: "application/json", "Content-Type": "application/json" },
				body: JSON.stringify({ action: "set-authtoken", authtoken: token }),
			});
			const j = (await r.json()) as { ok?: boolean; message?: string };
			setConfigMessage(typeof j.message === "string" ? j.message : r.ok ? "Done." : `HTTP ${r.status}`);
			if (j.ok) setAuthtokenDraft("");
			await refreshAll();
		} catch {
			setConfigMessage("Request failed (is the Bun server running?)");
		} finally {
			setConfigBusy(false);
		}
	}, [tunnelLoadState, tunnelStatus?.authtokenSaveAllowed, configBusy, authtokenDraft, refreshAll]);

	const thisTabUrl = typeof window !== "undefined" ? `${window.location.origin}/` : "";
	const tunnelPort = tunnelStatus?.tunnelPort ?? hints?.vitePort ?? 5173;
	const publicUrl = hints?.ngrokPublicUrl ?? tunnelStatus?.publicUrl ?? null;
	const inspectorUrl = tunnelStatus?.inspectorUrl ?? "http://127.0.0.1:4040/";
	const backendListening = tunnelStatus?.backendListening !== false;

	if (!open) return null;

	return (
		<div
			className={`fixed inset-0 z-[200] flex items-center justify-center p-4 ${overlay}`}
			role="presentation"
			onMouseDown={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div
				className={`flex min-h-0 max-h-[92vh] w-full max-w-[min(1560px,calc(100vw-1rem))] flex-col overflow-hidden rounded-xl border shadow-2xl ${panel}`}
				role="dialog"
				aria-modal
				aria-labelledby="wop-ngrok-settings-title"
				onMouseDown={(e) => e.stopPropagation()}
			>
				<div className={`flex shrink-0 items-start justify-between gap-3 border-b px-5 py-3 ${borderB}`}>
					<div className="flex min-w-0 flex-1 items-center gap-2">
						<Globe className="shrink-0 text-[#38bdf8]" size={22} aria-hidden />
						<div className="min-w-0">
							<h2 id="wop-ngrok-settings-title" className="text-lg font-bold">
								ngrok (optional)
							</h2>
							<p className={`mt-0.5 text-[11px] font-normal leading-snug ${sub}`}>Public URL to localhost - skip if you only use Way of Pi locally.</p>
						</div>
					</div>
					<div className="flex shrink-0 items-center gap-1">
						<button
							type="button"
							onClick={() => setTerminalPanelVisiblePersist(!terminalPanelVisible)}
							className={`rounded px-2.5 py-1.5 text-[11px] font-medium ${
								appearanceDark
									? "text-[#cccccc] hover:bg-[#3c3c3c]"
									: "text-[#333] hover:bg-black/[0.06]"
							}`}
							aria-pressed={terminalPanelVisible}
							title={terminalPanelVisible ? "Hide the embedded terminal (chips + PTY)" : "Show the embedded terminal panel"}
						>
							{terminalPanelVisible ? "Hide terminal" : "Show terminal"}
						</button>
						<button type="button" onClick={onClose} className="rounded p-1 hover:bg-black/10 dark:hover:bg-[#3c3c3c]" aria-label="Close">
							<X size={20} />
						</button>
					</div>
				</div>

				<div
					ref={splitRowRef}
					className="flex min-h-0 flex-1 flex-col overflow-hidden md:h-[min(calc(92vh-52px),calc(92dvh-52px))] md:max-h-[min(calc(92vh-52px),calc(92dvh-52px))] md:flex-row md:items-stretch"
				>
					<div
						className="relative z-0 min-h-0 min-w-0 flex-1 basis-0 touch-pan-y overflow-y-auto overscroll-y-contain px-5 py-4 text-[13px] leading-relaxed"
						style={{ WebkitOverflowScrolling: "touch" }}
					>
					<p className={`mb-3 text-[12px] leading-relaxed ${sub}`}>
						<strong className={appearanceDark ? "text-[#e0e0e0]" : "text-[#111]"}>Optional.</strong> Use ngrok only when you want a temporary public{" "}
						<Mono dark={appearanceDark}>https://...</Mono> link (remote browser, phone on cellular, webhooks). You do not need it for normal local development.
					</p>
					<p className={`mb-3 text-[12px] leading-relaxed ${sub}`}>
						More detail:{" "}
						<button
							type="button"
							onClick={() => onOpenShareNgrokHelp()}
							title="Open Help - Share with ngrok"
							aria-label="Open Help: How to use, Share with ngrok"
							className={`inline max-w-full rounded px-0.5 py-0 text-left font-medium underline decoration-dotted underline-offset-2 transition-colors hover:decoration-solid ${helpLinkBtn}`}
						>
							menu bar <strong className="font-semibold">Help</strong>
							{" → "}
							<strong className="font-semibold">How to use</strong>
							{" → "}
							<strong className="font-semibold">Share with ngrok</strong>
						</button>
						.
					</p>

					{tunnelLoadState === "dev" && tunnelStatus ? (
						<div className={`mb-4 rounded-lg border p-4 ${card}`}>
							<h3 className="mb-2 font-semibold">1. Install ngrok (only if you use tunnels)</h3>
							{tunnelStatus.ngrokOnPath ? (
								<>
									<p className={`text-[12px] leading-relaxed ${sub}`}>
										<strong className={appearanceDark ? "text-[#e0e0e0]" : "text-[#111]"}>CLI ready</strong>
										{tunnelStatus.ngrokVersionLine ? (
											<>
												{" - "}
												<Mono dark={appearanceDark}>{tunnelStatus.ngrokVersionLine}</Mono>
											</>
										) : null}
										{tunnelStatus.ngrokWhichPath ? (
											<>
												<br />
												<span className="text-[11px] opacity-90">
													Executable: <Mono dark={appearanceDark}>{tunnelStatus.ngrokWhichPath}</Mono>
													{ngrokSourceDescription(tunnelStatus.ngrokResolvedSource) ? (
														<>
															{" "}
															({ngrokSourceDescription(tunnelStatus.ngrokResolvedSource)})
														</>
													) : null}
												</span>
											</>
										) : null}
									</p>
									{tunnelStatus.installBundledAllowed ? (
										<div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
											<button
												type="button"
												disabled={bundledPkgBusy || refreshing}
												onClick={() => void onUpdateBundledNgrok()}
												className={`rounded border px-3 py-2 text-[12px] font-medium ${
													appearanceDark
														? "border-[#454545] bg-[#2d2d2d] text-[#cccccc] hover:bg-[#3c3c3c] disabled:opacity-40"
														: "border-[#ccc] bg-white text-[#222] hover:bg-[#f5f5f5] disabled:opacity-40"
												}`}
												title="Runs bun update ngrok or npm update ngrok in apps/wayofwork-ui on the server. Does not upgrade a system ngrok on PATH."
											>
												{bundledOpBusy === "update" ? "Updating..." : "Update ngrok in app"}
											</button>
											<button
												type="button"
												disabled={refreshing || bundledPkgBusy}
												onClick={() => void refreshAll()}
												className={`rounded border px-3 py-2 text-[12px] font-medium ${
													appearanceDark
														? "border-[#454545] bg-[#2d2d2d] text-[#cccccc] hover:bg-[#3c3c3c] disabled:opacity-40"
														: "border-[#ccc] bg-white text-[#222] hover:bg-[#f5f5f5] disabled:opacity-40"
												}`}
											>
												Refresh status
											</button>
										</div>
									) : null}
									{installMessage ? (
										<p className={`mt-3 text-[12px] ${sub}`}>
											<strong className={appearanceDark ? "text-[#e0e0e0]" : "text-[#111]"}>Package:</strong> {installMessage}
										</p>
									) : null}
								</>
							) : tunnelStatus.ngrokWhichPath && !tunnelStatus.ngrokOnPath ? (
								<div className={`text-[12px] leading-relaxed ${sub}`}>
									<p className="mb-2 text-amber-700 dark:text-amber-400">
										A file was found but <strong className={appearanceDark ? "text-[#e0e0e0]" : "text-[#111]"}>ngrok version</strong> did not
										succeed. Check permissions or reinstall.
									</p>
									<Mono dark={appearanceDark}>{tunnelStatus.ngrokWhichPath}</Mono>
								</div>
							) : (
								<>
									<p className={`mb-3 text-[12px] leading-relaxed ${sub}`}>
										<strong className={appearanceDark ? "text-[#e0e0e0]" : "text-[#111]"}>Get the agent:</strong> use the button below. The
										server runs <Mono dark={appearanceDark}>bun install</Mono> or <Mono dark={appearanceDark}>npm install</Mono> in{" "}
										<Mono dark={appearanceDark}>apps/wayofwork-ui</Mono> so the optional <Mono dark={appearanceDark}>ngrok</Mono> package can place the
										official binary under <Mono dark={appearanceDark}>node_modules/ngrok/bin</Mono>. Then add your dashboard authtoken (section 2) and
										turn on the tunnel (section 3).
									</p>
									{tunnelStatus.installBundledAllowed ? (
										<div className="mb-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
											<button
												type="button"
												disabled={bundledPkgBusy || refreshing}
												onClick={() => void onInstallBundledNgrok()}
												className={primaryBtn}
											>
												{bundledOpBusy === "install" ? "Installing..." : "Install ngrok into this app"}
											</button>
											<button
												type="button"
												disabled={refreshing || bundledPkgBusy}
												onClick={() => void refreshAll()}
												className={`rounded border px-3 py-2 text-[12px] font-medium ${
													appearanceDark
														? "border-[#454545] bg-[#2d2d2d] text-[#cccccc] hover:bg-[#3c3c3c] disabled:opacity-40"
														: "border-[#ccc] bg-white text-[#222] hover:bg-[#f5f5f5] disabled:opacity-40"
												}`}
											>
												Refresh status
											</button>
										</div>
									) : (
										<p className={`mb-3 text-[12px] text-amber-700 dark:text-amber-400`}>
											The server reports bundled install is disabled for this session.
										</p>
									)}
									{installMessage ? (
										<p className={`mb-3 text-[12px] ${sub}`}>
											<strong className={appearanceDark ? "text-[#e0e0e0]" : "text-[#111]"}>Package:</strong> {installMessage}
										</p>
									) : null}
									<p className={`mb-3 text-[12px] leading-relaxed ${sub}`}>
										No tunnel yet? You can close this dialog - local editing and chat work the same.
									</p>
									<a
										href="https://dashboard.ngrok.com/get-started/your-authtoken"
										target="_blank"
										rel="noreferrer"
										className={`mr-2 inline-flex items-center gap-1.5 rounded border px-3 py-2 text-[12px] font-medium no-underline ${
											appearanceDark
												? "border-[#454545] bg-[#2d2d2d] text-[#cccccc] hover:bg-[#3c3c3c]"
												: "border-[#ccc] bg-white text-[#222] hover:bg-[#f5f5f5]"
										}`}
									>
										Open ngrok authtoken page
										<ExternalLink size={14} className="opacity-80" aria-hidden />
									</a>
									<a
										href="https://ngrok.com/download"
										target="_blank"
										rel="noreferrer"
										className={`inline-flex items-center gap-1.5 rounded border px-3 py-2 text-[12px] font-medium no-underline ${
											appearanceDark
												? "border-[#454545] bg-[#2d2d2d] text-[#cccccc] hover:bg-[#3c3c3c]"
												: "border-[#ccc] bg-white text-[#222] hover:bg-[#f5f5f5]"
										}`}
									>
										System install (ngrok.com)
										<ExternalLink size={14} className="opacity-80" aria-hidden />
									</a>
								</>
							)}
						</div>
					) : null}

					<details className={`mb-4 rounded-lg border p-4 ${card}`}>
						<summary className={`cursor-pointer text-[13px] font-semibold ${appearanceDark ? "text-[#e0e0e0]" : "text-[#111]"}`}>
							Optional: system install (apt / Homebrew) + repo helper script
						</summary>
						<div className={`mt-3 space-y-4 text-[12px] leading-relaxed ${sub}`}>
							<p>
								For a <strong className={appearanceDark ? "text-[#e0e0e0]" : "text-[#111]"}>system-wide</strong> <Mono dark={appearanceDark}>ngrok</Mono>{" "}
								on PATH, use the official package repos below (run in a terminal on the <strong className={appearanceDark ? "text-[#e0e0e0]" : "text-[#111]"}>same machine</strong> as the Bun server), or from the repo root run{" "}
								<Mono dark={appearanceDark}>./scripts/install-ngrok-optional.sh</Mono> (prints these commands; <Mono dark={appearanceDark}>--install</Mono> runs apt on Debian/Ubuntu with sudo).
							</p>
							<div>
								<div className={`mb-1 text-[11px] font-semibold uppercase tracking-wide ${sub}`}>Debian / Ubuntu - apt</div>
								<pre className={`overflow-x-auto rounded border p-3 font-mono text-[10px] leading-snug ${pre}`}>
									{`curl -sSL https://ngrok-agent.s3.amazonaws.com/ngrok.asc \\
  | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null \\
  && echo "deb https://ngrok-agent.s3.amazonaws.com $(. /etc/os-release; echo $VERSION_CODENAME) main" \\
  | sudo tee /etc/apt/sources.list.d/ngrok.list \\
  && sudo apt update && sudo apt install -y ngrok`}
								</pre>
							</div>
							<div>
								<div className={`mb-1 text-[11px] font-semibold uppercase tracking-wide ${sub}`}>macOS - Homebrew</div>
								<pre className={`overflow-x-auto rounded border p-3 font-mono text-[10px] leading-snug ${pre}`}>
									brew install ngrok/ngrok/ngrok
								</pre>
							</div>
							<p className={`text-[11px] ${sub}`}>
								Then press <strong className={appearanceDark ? "text-[#e0e0e0]" : "text-[#111]"}>Refresh</strong> in section 1, paste your dashboard authtoken in section 2, and start the tunnel in section 3. Way of Pi tunnels{" "}
								<Mono dark={appearanceDark}>ngrok http {tunnelPort}</Mono> (Vite + proxy), not port 80 - unless you only run Bun on 80.
							</p>
						</div>
					</details>

					{tunnelLoadState === "dev" && tunnelStatus && tunnelStatus.authtokenSaveAllowed !== false ? (
						<div className={`mb-4 rounded-lg border p-4 ${card}`}>
							<h3 className="mb-2 font-semibold">2. Authtoken (required before a new tunnel works)</h3>
							<p className={`mb-3 text-[12px] leading-relaxed ${sub}`}>
								Paste <strong className={appearanceDark ? "text-[#e0e0e0]" : "text-[#111]"}>Your Authtoken</strong> from the{" "}
								<a href="https://dashboard.ngrok.com/get-started/your-authtoken" target="_blank" rel="noreferrer" className={helpLinkBtn}>
									ngrok dashboard
								</a>
								. Way of Pi runs <Mono dark={appearanceDark}>ngrok config add-authtoken ...</Mono> on the{" "}
								<strong className={appearanceDark ? "text-[#e0e0e0]" : "text-[#111]"}>host</strong> (the Bun server), not inside the browser.
								This works even if <Mono dark={appearanceDark}>WOP_ALLOW_NGROK_SPAWN</Mono> is off (section 3 only needs that for the managed switch).
							</p>
							<label htmlFor="wop-ngrok-authtoken" className={`mb-1 block text-[11px] font-semibold uppercase tracking-wide ${sub}`}>
								Authtoken
							</label>
							<input
								id="wop-ngrok-authtoken"
								type="password"
								autoComplete="off"
								spellCheck={false}
								value={authtokenDraft}
								onChange={(e) => setAuthtokenDraft(e.target.value)}
								placeholder="ngrok_..."
								disabled={configBusy || !tunnelStatus.ngrokOnPath}
								className={passwordField}
							/>
							<div className="mt-3 flex flex-wrap items-center gap-2">
								<button
									type="button"
									disabled={configBusy || refreshing || !authtokenDraft.trim() || !tunnelStatus.ngrokOnPath}
									onClick={() => void onSaveAuthtoken()}
									className={primaryBtn}
								>
									{configBusy ? "Saving..." : "Save authtoken on this machine"}
								</button>
							</div>
							{configMessage ? (
								<p className={`mt-3 text-[12px] ${sub}`}>
									<strong className={appearanceDark ? "text-[#e0e0e0]" : "text-[#111]"}>Authtoken:</strong> {configMessage}
								</p>
							) : null}
						</div>
					) : null}

					{tunnelLoadState === "dev" && tunnelStatus && !backendListening ? (
						<div
							className={`mb-4 rounded-lg border border-amber-600/50 bg-amber-500/10 px-4 py-3 text-[12px] leading-relaxed ${
								appearanceDark ? "text-[#fcd34d]" : "text-amber-950"
							}`}
						>
							<strong className={appearanceDark ? "text-[#fde68a]" : "text-amber-900"}>
								Nothing is listening on 127.0.0.1:{tunnelPort}.
							</strong>{" "}
							Start the dev server first (Vite on that port with Bun on 3333, or your usual ./start-wayofwork-ui.sh). Way of Pi will refuse to start the
							managed tunnel until the port answers, so ngrok is not forwarding into an empty socket.{" "}
							<strong className={appearanceDark ? "text-[#fde68a]" : "text-amber-900"}>ERR_NGROK_3200 / “endpoint offline”</strong> also appears if you open
							an old <Mono dark={appearanceDark}>https://…ngrok…</Mono> bookmark after the tunnel stopped — copy a fresh link from{" "}
							<a href={inspectorUrl} target="_blank" rel="noreferrer" className={helpLinkBtn}>
								the ngrok inspector
							</a>{" "}
							while the tunnel is running.
						</div>
					) : null}

					<NgrokTunnelControlRow
						dark={appearanceDark}
						loadState={tunnelLoadState}
						allowControl={tunnelStatus?.allowControl ?? false}
						ngrokOnPath={tunnelStatus?.ngrokOnPath ?? false}
						wopManagedRunning={tunnelStatus?.wopManagedRunning ?? false}
						tunnelPort={tunnelPort}
						busy={actionBusy || refreshing}
						prodMessage={tunnelProdMessage}
						backendListening={backendListening}
						onStartStop={() => void onTunnelToggle()}
					/>

					{tunnelLoadState === "dev" && gateStatus ? (
						<div className={`mb-4 rounded-lg border p-4 ${card}`}>
							<h3 className="mb-2 font-semibold">4. Tunnel login (optional)</h3>
							<p className={`mb-3 text-[12px] leading-relaxed ${sub}`}>
								When someone opens your app through an <strong className={appearanceDark ? "text-[#e0e0e0]" : "text-[#111]"}>ngrok-style</strong>{" "}
								hostname, Way of Pi can require <strong className={appearanceDark ? "text-[#e0e0e0]" : "text-[#111]"}>HTTP Basic Auth</strong>{" "}
								(browser login prompt) before any page, <Mono dark={appearanceDark}>/api</Mono>, or <Mono dark={appearanceDark}>/ws</Mono>.{" "}
								<strong className={appearanceDark ? "text-[#e0e0e0]" : "text-[#111]"}>localhost</strong> stays open so you can configure from this
								machine. First-time setup should be done on <Mono dark={appearanceDark}>http://localhost:...</Mono> before sharing the public link.
							</p>
							<p className={`mb-3 text-[11px] leading-relaxed ${sub}`}>
								Stored under <Mono dark={appearanceDark}>{gateStatus.wopHome}</Mono> ({`tunnel-gate.v1.json`}). Override the data dir with{" "}
								<Mono dark={appearanceDark}>WOP_HOME</Mono> if needed.
							</p>
							<label className={`mb-2 flex cursor-pointer items-center gap-2 text-[12px] ${sub}`}>
								<input
									type="checkbox"
									checked={tunnelLoginEnabled}
									onChange={(e) => setTunnelLoginEnabled(e.target.checked)}
									disabled={gateBusy || refreshing}
									className="h-4 w-4 shrink-0"
								/>
								<span>
									<strong className={appearanceDark ? "text-[#e0e0e0]" : "text-[#111]"}>Require login</strong> on tunnel hostname
									{gateStatus.loginEnabled ? (
										<span className="ml-1 text-emerald-600 dark:text-emerald-400">(on)</span>
									) : (
										<span className="ml-1 opacity-80">(off)</span>
									)}
								</span>
							</label>
							<label htmlFor="wop-tunnel-login-user" className={`mb-1 block text-[11px] font-semibold uppercase tracking-wide ${sub}`}>
								Login name
							</label>
							<input
								id="wop-tunnel-login-user"
								type="text"
								autoComplete="username"
								spellCheck={false}
								value={tunnelLoginUser}
								onChange={(e) => setTunnelLoginUser(e.target.value)}
								disabled={gateBusy || refreshing}
								className={`mb-3 w-full ${passwordField}`}
								placeholder="e.g. you"
							/>
							<label htmlFor="wop-tunnel-login-pass" className={`mb-1 block text-[11px] font-semibold uppercase tracking-wide ${sub}`}>
								Password
							</label>
							<input
								id="wop-tunnel-login-pass"
								type="password"
								autoComplete="new-password"
								spellCheck={false}
								value={tunnelLoginPass}
								onChange={(e) => setTunnelLoginPass(e.target.value)}
								disabled={gateBusy || refreshing}
								className={`mb-3 w-full ${passwordField}`}
								placeholder={gateStatus.configured ? "(unchanged if left empty)" : "at least 8 characters"}
							/>
							<div className="flex flex-wrap items-center gap-2">
								<button
									type="button"
									disabled={
										gateBusy ||
										refreshing ||
										!tunnelLoginUser.trim() ||
										(!gateStatus.configured && tunnelLoginPass.length === 0)
									}
									onClick={() => void onSaveTunnelGate()}
									className={primaryBtn}
								>
									{gateBusy ? "Saving..." : "Save tunnel login"}
								</button>
								<button
									type="button"
									disabled={gateBusy || refreshing || !gateStatus.configured}
									onClick={() => void onClearTunnelGate()}
									className={`rounded border px-3 py-2 text-[12px] font-medium ${
										appearanceDark
											? "border-[#454545] bg-[#2d2d2d] text-[#cccccc] hover:bg-[#3c3c3c] disabled:opacity-40"
											: "border-[#ccc] bg-white text-[#222] hover:bg-[#f5f5f5] disabled:opacity-40"
									}`}
								>
									Remove saved login
								</button>
							</div>
							{gateMessage ? (
								<p className={`mt-3 text-[12px] ${sub}`}>
									<strong className={appearanceDark ? "text-[#e0e0e0]" : "text-[#111]"}>Tunnel login:</strong> {gateMessage}
								</p>
							) : null}
						</div>
					) : tunnelLoadState === "dev" && gateLoadError ? (
						<p className={`mb-3 text-[12px] text-amber-600 dark:text-amber-400`}>{gateLoadError}</p>
					) : null}

					{actionMessage ? (
						<p className={`mb-3 text-[12px] ${sub}`}>
							<strong className={appearanceDark ? "text-[#e0e0e0]" : "text-[#111]"}>Tunnel:</strong> {actionMessage}
						</p>
					) : null}

					<div className={`mb-4 rounded-lg border p-4 ${card}`}>
						<div className="mb-2 flex items-center justify-between gap-2">
							<h3 className="font-semibold">Copy addresses</h3>
							<button
								type="button"
								onClick={() => void refreshAll()}
								disabled={refreshing}
								className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-[11px] font-medium ${
									appearanceDark
										? "border-[#454545] bg-[#2d2d2d] text-[#cccccc] hover:bg-[#3c3c3c] disabled:opacity-40"
										: "border-[#ccc] bg-white text-[#222] hover:bg-[#f5f5f5] disabled:opacity-40"
								}`}
							>
								<RefreshCw size={12} className={refreshing ? "animate-spin" : ""} aria-hidden />
								Refresh
							</button>
						</div>
						<p className={`mb-3 text-[12px] ${sub}`}>
							<strong className={appearanceDark ? "text-[#e0e0e0]" : "text-[#111]"}>Same Wi-Fi</strong> - use the LAN line on your phone.
							<strong className={appearanceDark ? "text-[#e0e0e0]" : "text-[#111]"}> Another place</strong> (work, travel, mobile data) - use
							the <strong className={appearanceDark ? "text-[#e0e0e0]" : "text-[#111]"}>public</strong> line below, or turn on the managed
							tunnel in section 3. You can also open <Mono dark={appearanceDark}>{inspectorUrl.replace(/\/$/, "")}</Mono> on the{" "}
							<strong className={appearanceDark ? "text-[#e0e0e0]" : "text-[#111]"}>same machine</strong> as ngrok (inspector).
						</p>
						{hintsError ? <p className="mb-2 text-[12px] text-amber-600 dark:text-amber-400">{hintsError}</p> : null}
						<div className="space-y-4">
							<CopyRow label="This tab (same machine or tunnel)" value={thisTabUrl} dark={appearanceDark} />
							{hints?.lanUrl ? (
								<CopyRow
									label={`Phone on home Wi-Fi (LAN, port ${hints.vitePort})`}
									value={hints.lanUrl}
									dark={appearanceDark}
								/>
							) : hints && !hints.lanUrl ? (
								<p className={`text-[12px] ${sub}`}>
									Home Wi-Fi URL not guessed. On the PC run <Mono dark={appearanceDark}>ip -4 route get 1.1.1.1</Mono> and use the{" "}
									<Mono dark={appearanceDark}>src</Mono> IP: <Mono dark={appearanceDark}>http://THAT_IP:{hints.vitePort}/</Mono>
								</p>
							) : null}
							{publicUrl ? (
								<CopyRow label="Public link (work, travel, any network)" value={publicUrl} dark={appearanceDark} />
							) : (
								<div className={`space-y-3 text-[12px] ${sub}`}>
									<p>
										<strong className={appearanceDark ? "text-[#e0e0e0]" : "text-[#111]"}>No public link yet.</strong> The line above will fill in
										with your <strong className={appearanceDark ? "text-[#e0e0e0]" : "text-[#111]"}>https://...ngrok...</strong> URL after section 3 is on and
										ngrok has published a tunnel. Turn the tunnel <strong className={appearanceDark ? "text-[#e0e0e0]" : "text-[#111]"}>on</strong> (CLI
										ready + authtoken in section 2 + <Mono dark={appearanceDark}>WOP_ALLOW_NGROK_SPAWN</Mono> not off), then tap{" "}
										<strong className={appearanceDark ? "text-[#e0e0e0]" : "text-[#111]"}>Refresh</strong>.
									</p>
									{tunnelLoadState === "dev" && tunnelStatus?.ngrokOnPath && tunnelStatus?.allowControl && !tunnelStatus?.wopManagedRunning ? (
										<button
											type="button"
											disabled={actionBusy || refreshing}
											onClick={() => void onTunnelToggle()}
											className={primaryBtn}
										>
											Start tunnel now
										</button>
									) : null}
									<p className={`text-[11px] leading-relaxed ${sub}`}>
										<strong className={appearanceDark ? "text-[#e0e0e0]" : "text-[#111]"}>Sign in to ngrok (get authtoken):</strong>{" "}
										<a
											href="https://dashboard.ngrok.com/"
											target="_blank"
											rel="noreferrer"
											className={helpLinkBtn}
										>
											https://dashboard.ngrok.com/
										</a>
									</p>
									<p className={`text-[11px] leading-relaxed ${sub}`}>
										<strong className={appearanceDark ? "text-[#e0e0e0]" : "text-[#111]"}>See the public URL on this machine:</strong>{" "}
										<a href={inspectorUrl} target="_blank" rel="noreferrer" className={helpLinkBtn}>
											{inspectorUrl}
										</a>{" "}
										(ngrok inspector — only on the PC where ngrok runs; set <Mono dark={appearanceDark}>WOP_NGROK_WEB_ADDR</Mono> if your agent uses a
										non-default web address).
									</p>
									<p className={`text-[11px] leading-relaxed ${sub}`}>
										<strong className={appearanceDark ? "text-[#e0e0e0]" : "text-[#111]"}>Tunnel login (section 4):</strong> there is no separate login
										URL. Whoever opens your <strong className={appearanceDark ? "text-[#e0e0e0]" : "text-[#111]"}>public https</strong> link gets a browser
										prompt for the username and password you set.
									</p>
								</div>
							)}
						</div>
					</div>

					<details className={`mb-4 rounded-lg border p-4 ${card}`}>
						<summary className={`cursor-pointer text-[13px] font-semibold ${appearanceDark ? "text-[#e0e0e0]" : "text-[#111]"}`}>
							Ports, WebSockets, and security
						</summary>
						<div className={`mt-3 space-y-3 text-[12px] leading-relaxed ${sub}`}>
							<p>
								<strong className={appearanceDark ? "text-[#e0e0e0]" : "text-[#111]"}>Fully supported, opt-in:</strong> Way of Pi resolves the ngrok
								agent from <Mono dark={appearanceDark}>WOP_NGROK_BINARY</Mono>, your PATH, or the{" "}
								<Mono dark={appearanceDark}>ngrok</Mono> optional package (after <Mono dark={appearanceDark}>bun install</Mono> in{" "}
								<Mono dark={appearanceDark}>apps/wayofwork-ui</Mono>), then runs <Mono dark={appearanceDark}>ngrok config add-authtoken</Mono> and{" "}
								<Mono dark={appearanceDark}>ngrok http {tunnelPort}</Mono> when allowed. Set <Mono dark={appearanceDark}>WOP_ALLOW_NGROK_SPAWN</Mono>{" "}
								off to block only the managed start/stop switch.
							</p>
							<p>
								API/WebSocket default <Mono dark={appearanceDark}>3333</Mono> (<Mono dark={appearanceDark}>WOP_SERVER_PORT</Mono>). Vite dev
								usually <Mono dark={appearanceDark}>5173</Mono> with <Mono dark={appearanceDark}>/api</Mono> and <Mono dark={appearanceDark}>/ws</Mono>{" "}
								proxied - match the port to how you open the app. Bun-only static: <Mono dark={appearanceDark}>ngrok http 3333</Mono>.
							</p>
							<p>
								Chat uses WebSockets; ngrok HTTP tunnels forward them to the same origin. Use{" "}
								<strong className={appearanceDark ? "text-[#e0e0e0]" : "text-[#111]"}>section 4 - Tunnel login</strong> so visitors hitting an
								ngrok-style hostname must enter the username and password you set; short-lived tunnels and stopping when done still matter.
							</p>
						</div>
					</details>

					<div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
						<a
							href="https://ngrok.com/"
							target="_blank"
							rel="noreferrer"
							className={`inline-flex items-center justify-center gap-1.5 rounded border px-3 py-2 text-[12px] font-medium no-underline ${
								appearanceDark
									? "border-[#454545] bg-[#2d2d2d] text-[#cccccc] hover:bg-[#3c3c3c]"
									: "border-[#ccc] bg-white text-[#222] hover:bg-[#f5f5f5]"
							}`}
						>
							ngrok.com
							<ExternalLink size={14} className="opacity-80" aria-hidden />
						</a>
						<a
							href="https://ngrok.com/docs"
							target="_blank"
							rel="noreferrer"
							className={`inline-flex items-center justify-center gap-1.5 rounded border px-3 py-2 text-[12px] font-medium no-underline ${
								appearanceDark
									? "border-[#454545] bg-[#2d2d2d] text-[#cccccc] hover:bg-[#3c3c3c]"
									: "border-[#ccc] bg-white text-[#222] hover:bg-[#f5f5f5]"
							}`}
						>
							ngrok docs
							<ExternalLink size={14} className="opacity-80" aria-hidden />
						</a>
						<a
							href={inspectorUrl}
							target="_blank"
							rel="noreferrer"
							className={`inline-flex items-center justify-center gap-1.5 rounded border px-3 py-2 text-[12px] font-medium no-underline ${
								appearanceDark
									? "border-[#454545] bg-[#2d2d2d] text-[#cccccc] hover:bg-[#3c3c3c]"
									: "border-[#ccc] bg-white text-[#222] hover:bg-[#f5f5f5]"
							}`}
						>
							ngrok inspector (this PC)
							<ExternalLink size={14} className="opacity-80" aria-hidden />
						</a>
						<a
							href="https://ngrok.com/download"
							target="_blank"
							rel="noreferrer"
							className={`inline-flex items-center justify-center gap-1.5 rounded border px-3 py-2 text-[12px] font-medium no-underline ${
								appearanceDark
									? "border-[#454545] bg-[#2d2d2d] text-[#cccccc] hover:bg-[#3c3c3c]"
									: "border-[#ccc] bg-white text-[#222] hover:bg-[#f5f5f5]"
							}`}
						>
							Download
							<ExternalLink size={14} className="opacity-80" aria-hidden />
						</a>
					</div>
					</div>

					{terminalPanelVisible && mdSplitLayout ? (
						<div className="relative z-[100] hidden h-full min-h-0 w-5 shrink-0 md:flex md:flex-col">
							<DockSplitHandle
								orientation="vertical"
								ariaLabel="Resize help and terminal panels"
								onDelta={onTerminalSplitDelta}
								className={
									appearanceDark
										? "!h-full min-h-0 w-full min-w-0 flex-1"
										: "!h-full min-h-0 w-full min-w-0 flex-1 !bg-[#e0e0e0] hover:!bg-[#d0d0d0] active:!bg-[#c4c4c4]"
								}
							/>
						</div>
					) : null}

					{terminalPanelVisible ? (
					<aside
						className={`relative z-0 flex w-full min-h-[220px] shrink-0 flex-col border-t md:h-full md:min-h-0 md:border-l md:border-t-0 ${
							appearanceDark ? "border-[#3c3c3c] bg-[#1a1a1a]" : "border-[#e5e5e5] bg-[#fafafa]"
						}`}
						style={mdSplitLayout ? { width: terminalAsidePx, minWidth: NGROK_MODAL_TERMINAL_MIN_PX } : undefined}
						aria-labelledby="wop-ngrok-terminal-heading"
					>
						<div
							className={`shrink-0 border-b px-3 py-2 ${appearanceDark ? "border-[#3c3c3c]" : "border-[#e5e5e5]"}`}
						>
							<h3
								id="wop-ngrok-terminal-heading"
								className={`text-[13px] font-bold leading-snug ${appearanceDark ? "text-[#e0e0e0]" : "text-[#111]"}`}
							>
								Terminal
							</h3>
							<p className={`mt-0.5 hidden text-[10px] font-normal leading-snug md:block ${sub}`}>
								Drag the split bar next to this panel to resize (wide windows only). Use{" "}
								<strong className={appearanceDark ? "text-[#e0e0e0]" : "text-[#111]"}>Hide terminal</strong> in the header for full-width help text.
							</p>
						</div>
						<div
							className={`shrink-0 border-b px-2 py-2 ${appearanceDark ? "border-[#3c3c3c] bg-[#252526]" : "border-[#e5e5e5] bg-[#f0f0f0]"}`}
						>
							<p className={`mb-1.5 text-[10px] leading-snug ${sub}`}>Insert / run (cwd = workspace, same PTY as bottom-panel Terminal):</p>
							<div className="flex flex-wrap gap-1">
								<button
									type="button"
									className={injectChipBtn}
									title={`Inserts: ngrok config add-authtoken (add your dashboard token, then Enter)`}
									onClick={() => injectIntoTerminal("ngrok config add-authtoken ")}
								>
									+ authtoken
								</button>
								<button
									type="button"
									className={injectChipBtn}
									title={`Inserts: ngrok http ${tunnelPort} (press Enter to run)`}
									onClick={() => injectIntoTerminal(`ngrok http ${tunnelPort}`)}
								>
									+ http {tunnelPort}
								</button>
								<button
									type="button"
									className={injectChipBtn}
									title={`Runs: ngrok http ${tunnelPort}`}
									onClick={() => injectIntoTerminal(`ngrok http ${tunnelPort}\r`)}
								>
									Run http
								</button>
								<button
									type="button"
									className={injectChipBtn}
									title="Runs: ngrok version"
									onClick={() => injectIntoTerminal("ngrok version\r")}
								>
									Run version
								</button>
								<button
									type="button"
									className={injectChipBtn}
									title="Inserts: cd apps/wayofwork-ui && bun install (optional ngrok package; same as Settings install button; use npm install --no-fund --no-audit if you do not use bun)"
									onClick={() => injectIntoTerminal("cd apps/wayofwork-ui && bun install")}
								>
									+ install ngrok
								</button>
								<button
									type="button"
									className={injectChipBtn}
									title="Runs: cd apps/wayofwork-ui && bun install (downloads optional ngrok into node_modules when listed in package.json)"
									onClick={() => injectIntoTerminal("cd apps/wayofwork-ui && bun install\r")}
								>
									Run install
								</button>
								<button
									type="button"
									className={injectChipBtn}
									title="Inserts: cd apps/wayofwork-ui && bun update ngrok (optional package; use npm update ngrok if you do not use bun)"
									onClick={() => injectIntoTerminal("cd apps/wayofwork-ui && bun update ngrok")}
								>
									+ update ngrok
								</button>
								<button
									type="button"
									className={injectChipBtn}
									title="Runs: cd apps/wayofwork-ui && bun update ngrok"
									onClick={() => injectIntoTerminal("cd apps/wayofwork-ui && bun update ngrok\r")}
								>
									Run update
								</button>
								<button
									type="button"
									className={injectChipBtn}
									title="Runs: cd apps/wayofwork-ui && bun run server/index.ts (from repo root layout)"
									onClick={() => injectIntoTerminal("cd apps/wayofwork-ui && bun run server/index.ts\r")}
								>
									Start Bun API
								</button>
							</div>
							{injectHint ? (
								<p className="mt-1.5 text-[10px] leading-snug text-amber-700 dark:text-amber-400">{injectHint}</p>
							) : null}
						</div>
						<div
							className="min-h-0 flex-1 overflow-hidden p-2"
							onMouseDown={(e) => e.stopPropagation()}
						>
							<div className="h-[min(38vh,320px)] min-h-[200px] w-full md:h-full md:min-h-0">
								<EmbeddedTerminal />
							</div>
						</div>
					</aside>
					) : null}
				</div>
			</div>
		</div>
	);
}
