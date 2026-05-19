import { X } from "lucide-react";
import { useState } from "react";
import { apiPostJson } from "../../api/client";

type RunResult =
	| { ok: true; exitCode: number; stdout: string; stderr: string }
	| { ok: false; message: string };

export function SimpleRunScriptsModal({
	open,
	onClose,
	scripts,
	loading,
	error,
	appearanceDark,
}: {
	open: boolean;
	onClose: () => void;
	scripts: Record<string, string> | null;
	loading: boolean;
	error: string | null;
	appearanceDark: boolean;
}) {
	const [running, setRunning] = useState<string | null>(null);
	const [result, setResult] = useState<RunResult | null>(null);

	if (!open) return null;

	const names = scripts ? Object.keys(scripts).sort((a, b) => a.localeCompare(b)) : [];

	const run = async (script: string) => {
		setRunning(script);
		setResult(null);
		try {
			const r = await apiPostJson<{
				ok: boolean;
				exitCode: number;
				stdout: string;
				stderr: string;
				error?: string;
			}>("/api/run-script", { script });
			if ("error" in r && r.error) {
				setResult({ ok: false, message: r.error });
			} else if (r.ok) {
				setResult({
					ok: true,
					exitCode: r.exitCode,
					stdout: r.stdout ?? "",
					stderr: r.stderr ?? "",
				});
			} else {
				setResult({
					ok: false,
					message: (r.stderr && r.stderr.trim()) || `Script exited with code ${r.exitCode}`,
				});
			}
		} catch (e) {
			setResult({ ok: false, message: e instanceof Error ? e.message : String(e) });
		} finally {
			setRunning(null);
		}
	};

	const panel = appearanceDark
		? "border-[#3c3c3c] bg-[#252526] text-[#cccccc]"
		: "border-[#e5e5e5] bg-white text-[#333333]";
	const muted = appearanceDark ? "text-[#858585]" : "text-[#616161]";
	const listBtn = appearanceDark
		? "border-[#3c3c3c] bg-[#3c3c3c] hover:bg-[#4a4a4a] text-left text-[#cccccc]"
		: "border-[#e5e5e5] bg-[#f3f3f3] hover:bg-[#e5e5e5] text-left text-[#333333]";

	return (
		<div
			className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4"
			role="presentation"
			onMouseDown={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
		<div
			className={`flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border shadow-2xl ${panel}`}
			role="dialog"
			aria-labelledby="run-scripts-title"
			onMouseDown={(e) => e.stopPropagation()}
		>
				<div className={`flex items-center justify-between border-b px-4 py-3 ${appearanceDark ? "border-[#3c3c3c]" : "border-[#e5e5e5]"}`}>
					<h2 id="run-scripts-title" className="text-lg font-bold">
						Run package script
					</h2>
					<button
						type="button"
						onClick={onClose}
						className={`rounded p-1 ${appearanceDark ? "text-[#858585] hover:bg-[#3c3c3c]" : "text-[#616161] hover:bg-[#e5e5e5]"}`}
						aria-label="Close"
					>
						<X size={20} />
					</button>
				</div>
				<div className="min-h-0 flex-1 overflow-y-auto p-4">
					<p className={`mb-3 text-sm ${muted}`}>
						Runs <code className="rounded bg-black/20 px-1">bun run &lt;script&gt;</code> in the workspace. The server must
						set <code className="rounded bg-black/20 px-1">WOP_ALLOW_RUN=1</code> (disabled by default for safety).
					</p>
					{loading ? <p className={muted}>Loading package.json…</p> : null}
					{error ? <p className="text-sm text-red-400">{error}</p> : null}
					{!loading && !error && names.length === 0 ? (
						<p className={muted}>No package.json scripts in this workspace.</p>
					) : null}
					<ul className="mt-2 flex flex-col gap-1">
						{names.map((name) => (
							<li key={name}>
								<button
									type="button"
									disabled={!!running}
									onClick={() => void run(name)}
									className={`w-full rounded-lg border px-3 py-2 text-sm disabled:opacity-50 ${listBtn}`}
								>
									<span className="font-mono font-bold">{name}</span>
									{running === name ? <span className="ml-2 text-xs">Running…</span> : null}
								</button>
							</li>
						))}
					</ul>
					{result ? (
						<div className="mt-4 rounded-lg border border-current/20 p-3 font-mono text-[11px]">
							{result.ok === false ? (
								<pre className="whitespace-pre-wrap text-red-400">{result.message}</pre>
							) : (
								<>
									<div className={`mb-2 ${result.ok ? "text-green-400" : "text-amber-400"}`}>
										Exit code: {result.exitCode}
									</div>
									{result.stdout ? (
										<pre className={`mb-2 max-h-40 overflow-auto whitespace-pre-wrap ${muted}`}>{result.stdout}</pre>
									) : null}
									{result.stderr ? (
										<pre className="max-h-32 overflow-auto whitespace-pre-wrap text-amber-400/90">{result.stderr}</pre>
									) : null}
								</>
							)}
						</div>
					) : null}
				</div>
			</div>
		</div>
	);
}
