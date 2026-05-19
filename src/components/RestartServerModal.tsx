import { X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { apiPostJson } from "../api/client";

type Phase = "confirm" | "pending" | "result";
type ResultKind = "exiting" | "blocked" | "unreachable";

function panelClass(appearanceDark: boolean) {
	return appearanceDark
		? "border-[#3c3c3c] bg-[#252526] text-[#cccccc]"
		: "border-[#e5e5e5] bg-white text-[#333333]";
}

function mutedClass(appearanceDark: boolean) {
	return appearanceDark ? "text-[#858585]" : "text-[#616161]";
}

function borderClass(appearanceDark: boolean) {
	return appearanceDark ? "border-[#3c3c3c]" : "border-[#e5e5e5]";
}

function parseRestart403Detail(raw: string): string | null {
	const m = raw.match(/^403:\s*(.+)$/s);
	if (!m) return null;
	try {
		const j = JSON.parse(m[1]!.trim()) as { hint?: string; error?: string };
		return j.hint?.trim() || j.error?.trim() || null;
	} catch {
		return m[1]!.trim() || null;
	}
}

function blockedLeadMessage(detail: string | null): string {
	const d = (detail ?? "").toLowerCase();
	if (d.includes("disables") || d.includes("disabled")) {
		return "Restarting from this menu was turned off in the settings for Way of Pi. You can still fully quit the app and open it again the way you usually do.";
	}
	if (d.includes("production") || d.includes("wop_allow_server_restart")) {
		return "On this setup, Way of Pi is not allowed to turn itself off from the menu. Ask whoever looks after your computer or network to restart it, or fully quit Way of Pi and open it again yourself.";
	}
	return "Way of Pi could not turn off from this menu. Fully quit the app and open it again the way you usually do.";
}

export function RestartServerModal({
	open,
	onClose,
	appearanceDark,
	onReconnectIfStillUp,
}: {
	open: boolean;
	onClose: () => void;
	appearanceDark: boolean;
	onReconnectIfStillUp: () => void;
}) {
	const [phase, setPhase] = useState<Phase>("confirm");
	const [resultKind, setResultKind] = useState<ResultKind>("exiting");
	const [technicalDetail, setTechnicalDetail] = useState<string | null>(null);

	useEffect(() => {
		if (!open) {
			setPhase("confirm");
			setTechnicalDetail(null);
		}
	}, [open]);

	useEffect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape" && phase !== "pending") onClose();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [open, onClose, phase]);

	const runRestart = useCallback(async () => {
		setPhase("pending");
		try {
			const r = await apiPostJson<{
				ok?: boolean;
				exiting?: boolean;
				message?: string;
				hint?: string;
			}>("/api/server/restart", {});
			if (r.ok && r.exiting) {
				setResultKind("exiting");
				setTechnicalDetail(r.message?.trim() || null);
				setPhase("result");
				return;
			}
			onReconnectIfStillUp();
			setResultKind("blocked");
			setTechnicalDetail(r.message?.trim() || r.hint?.trim() || "Unexpected response from server.");
			setPhase("result");
		} catch (e) {
			const raw = e instanceof Error ? e.message : String(e);
			const hint403 = parseRestart403Detail(raw);
			if (hint403 != null) {
				onReconnectIfStillUp();
				setResultKind("blocked");
				setTechnicalDetail(hint403);
				setPhase("result");
				return;
			}
			onReconnectIfStillUp();
			setResultKind("unreachable");
			setTechnicalDetail(raw);
			setPhase("result");
		}
	}, [onReconnectIfStillUp]);

	if (!open) return null;

	const panel = panelClass(appearanceDark);
	const muted = mutedClass(appearanceDark);
	const border = borderClass(appearanceDark);
	const codeBg = appearanceDark ? "bg-[#3c3c3c]" : "bg-[#ececec]";

	let title = "Turn Way of Pi off so it can start fresh?";
	if (phase === "pending") title = "Please wait";
	else if (phase === "result") {
		if (resultKind === "exiting") title = "Way of Pi is turning off";
		else if (resultKind === "blocked") title = "This cannot be done from the menu";
		else title = "Way of Pi did not respond";
	}

	return (
		<div
			className="fixed inset-0 z-[20000] flex items-center justify-center bg-black/60 p-4"
			role="presentation"
			onMouseDown={(e) => {
				if (e.target === e.currentTarget && phase !== "pending") onClose();
			}}
		>
			<div
				className={`flex w-full max-w-md flex-col overflow-hidden rounded-xl border shadow-2xl ${panel}`}
				role="dialog"
				aria-labelledby="restart-server-title"
				aria-modal="true"
				onMouseDown={(e) => e.stopPropagation()}
			>
				<div className={`flex shrink-0 items-center justify-between border-b px-4 py-3 ${border}`}>
					<h2 id="restart-server-title" className="text-[15px] font-semibold">
						{title}
					</h2>
					<button
						type="button"
						onClick={() => {
							if (phase !== "pending") onClose();
						}}
						disabled={phase === "pending"}
						className={`rounded p-1 ${
							appearanceDark
								? "text-[#858585] hover:bg-[#3c3c3c] hover:text-[#cccccc] disabled:opacity-40"
								: "text-[#616161] hover:bg-[#e5e5e5] disabled:opacity-40"
						}`}
						aria-label="Close"
					>
						<X size={20} />
					</button>
				</div>

				<div className="px-4 py-4 text-[13px] leading-relaxed">
					{phase === "confirm" ? (
						<>
							<p className="m-0 mb-3">
								This fully stops the background part of Way of Pi on your computer—similar to closing a program
								so updates can apply. Nothing is deleted; you are only switching it off so you can open it again.
							</p>
							<p className={`m-0 mb-3 ${muted}`}>
								After it stops, open Way of Pi again the same way you did today (your shortcut, script, or
								installer). The screen may briefly say it cannot connect until you start it again—that is normal.
							</p>
							<details className={muted}>
								<summary className="cursor-pointer select-none text-[12px]">
									If you build Way of Pi from source (optional steps)
								</summary>
								<p className="mt-2 text-[12px] leading-relaxed">
									From the{" "}
									<code className={`rounded px-1 py-0.5 font-mono text-[11px] ${codeBg}`}>apps/wayofwork-ui</code>{" "}
									folder in the project, run{" "}
									<code className={`rounded px-1 py-0.5 font-mono text-[11px] ${codeBg}`}>npm run dev</code> again
									when you are ready.
								</p>
							</details>
						</>
					) : null}

					{phase === "pending" ? (
						<p className={`m-0 ${muted}`}>Way of Pi is being asked to turn off…</p>
					) : null}

					{phase === "result" && resultKind === "exiting" ? (
						<>
							<p className="m-0 mb-3">
								Way of Pi is switching off now. When you are ready, open it again the same way you usually do.
							</p>
							{technicalDetail ? (
								<details className={muted}>
									<summary className="cursor-pointer select-none text-[12px]">Extra detail (for support)</summary>
									<p className="mt-2 whitespace-pre-wrap break-words font-mono text-[11px]">{technicalDetail}</p>
								</details>
							) : null}
						</>
					) : null}

					{phase === "result" && resultKind === "blocked" ? (
						<>
							<p className="m-0 mb-3">{blockedLeadMessage(technicalDetail)}</p>
							{technicalDetail ? (
								<details className={muted}>
									<summary className="cursor-pointer select-none text-[12px]">More information (for support or IT)</summary>
									<p className="mt-2 whitespace-pre-wrap break-words font-mono text-[11px]">{technicalDetail}</p>
								</details>
							) : null}
						</>
					) : null}

					{phase === "result" && resultKind === "unreachable" ? (
						<>
							<p className="m-0 mb-3">
								We could not finish the request. Way of Pi may already be off, or something briefly interrupted the
								connection. Try opening Way of Pi again. Chat and files will work again once the app is running.
							</p>
							{technicalDetail ? (
								<details className={muted}>
									<summary className="cursor-pointer select-none text-[12px]">Extra detail (for support)</summary>
									<p className="mt-2 whitespace-pre-wrap break-words font-mono text-[11px]">{technicalDetail}</p>
								</details>
							) : null}
						</>
					) : null}
				</div>

				<div className={`flex shrink-0 flex-wrap items-center justify-end gap-2 border-t px-4 py-3 ${border}`}>
					{phase === "confirm" ? (
						<>
							<button
								type="button"
								onClick={onClose}
								className={`rounded border px-4 py-2 text-[13px] font-medium ${
									appearanceDark
										? "border-[#454545] text-[#cccccc] hover:bg-[#2a2d2e]"
										: "border-[#c8c8c8] text-[#333333] hover:bg-[#f3f3f3]"
								}`}
							>
								Not now
							</button>
							<button
								type="button"
								onClick={() => void runRestart()}
								className="rounded bg-[#007acc] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#006bb3]"
							>
								Turn off Way of Pi
							</button>
						</>
					) : null}
					{phase === "pending" ? (
						<span className={`text-[12px] ${muted}`}>Please wait…</span>
					) : null}
					{phase === "result" ? (
						<button
							type="button"
							onClick={onClose}
							className="rounded bg-[#007acc] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#006bb3]"
						>
							OK
						</button>
					) : null}
				</div>
			</div>
		</div>
	);
}
