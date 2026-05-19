import { BotMessageSquare, Check, ChevronDown, Info, Plus, Trash2, Users, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { apiGet, apiPutJson } from "../api/client";
import type { AgentMeta } from "../hooks/useAgents";
import type { FileGetResponse } from "../types/workspaceFile";
import { parseTeamsYaml, serializeTeamsYaml } from "../utils/teamsYaml";

const TEAM_ID_RE = /^[a-zA-Z0-9_-]+$/;

async function fetchTeamsFromFile(path: string): Promise<Record<string, string[]> | null> {
	try {
		const r = await apiGet<FileGetResponse>(`/api/file?path=${encodeURIComponent(path)}`);
		if ("encoding" in r && r.encoding === "base64") return null;
		return parseTeamsYaml(r.content);
	} catch {
		return null;
	}
}

/** Dropdown that lists agents and lets the user pick one to add. */
function AddMemberDropdown({
	agents,
	existing,
	appearanceDark,
	onAdd,
}: {
	agents: AgentMeta[];
	existing: Set<string>;
	appearanceDark: boolean;
	onAdd: (name: string) => void;
}) {
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const [custom, setCustom] = useState("");
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!open) return;
		const handler = (e: MouseEvent) => {
			if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
		};
		document.addEventListener("mousedown", handler);
		return () => document.removeEventListener("mousedown", handler);
	}, [open]);

	const filtered = agents
		.filter((a) => !existing.has(a.name) && a.name.toLowerCase().includes(query.toLowerCase()))
		.sort((a, b) => a.name.localeCompare(b.name));

	const pick = (name: string) => {
		onAdd(name);
		setOpen(false);
		setQuery("");
	};

	const addCustom = () => {
		const n = custom.trim();
		if (n && TEAM_ID_RE.test(n) && !existing.has(n)) {
			onAdd(n);
			setCustom("");
			setOpen(false);
		}
	};

	const bg = appearanceDark ? "bg-[#1e1e1e] border-[#3c3c3c]" : "bg-white border-[#d4d4d4]";
	const inputCls = appearanceDark
		? "bg-[#252526] border-[#454545] text-[#cccccc] placeholder-[#6b6b6b]"
		: "bg-white border-[#d4d4d4] text-[#333333] placeholder-[#999]";
	const hoverRow = appearanceDark ? "hover:bg-[#2a2d2e]" : "hover:bg-[#f0f0f0]";

	return (
		<div ref={ref} className="relative">
			<button
				type="button"
				onClick={() => setOpen((v) => !v)}
				className={`flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold transition-colors ${
					appearanceDark
						? "border-[#454545] text-[#858585] hover:border-[#ea580c]/50 hover:text-[#fed7aa]"
						: "border-[#d4d4d4] text-[#616161] hover:border-[#ea580c]/50 hover:text-[#c2410c]"
				}`}
			>
				<Plus size={12} />
				Add member
				<ChevronDown size={12} className={`transition-transform ${open ? "rotate-180" : ""}`} />
			</button>

			{open && (
				<div
					className={`absolute left-0 top-full z-[150] mt-1 w-64 rounded-xl border shadow-2xl ${bg}`}
					onMouseDown={(e) => e.stopPropagation()}
				>
					<div className="border-b border-[#3c3c3c]/40 px-3 py-2">
						<input
							autoFocus
							type="text"
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							placeholder="Search agents…"
							className={`w-full rounded border px-2 py-1 text-xs ${inputCls}`}
						/>
					</div>
					<ul className="max-h-52 overflow-y-auto py-1">
						{filtered.length === 0 ? (
							<li className="px-3 py-2 text-xs text-[#858585]">
								{agents.length === 0 ? "No agents in workspace" : "No more agents to add"}
							</li>
						) : (
							filtered.map((a) => (
								<li key={a.name}>
									<button
										type="button"
										onClick={() => pick(a.name)}
										className={`flex w-full flex-col px-3 py-2 text-left text-xs ${hoverRow}`}
									>
										<span className={`font-bold ${appearanceDark ? "text-[#cccccc]" : "text-[#333333]"}`}>
											{a.name}
										</span>
										{a.description && (
											<span className="text-[#858585] line-clamp-1">{a.description}</span>
										)}
									</button>
								</li>
							))
						)}
					</ul>
					<div className="border-t border-[#3c3c3c]/40 px-3 py-2">
						<p className="mb-1.5 text-[11px] text-[#858585]">Or type a custom agent name:</p>
						<div className="flex gap-1.5">
							<input
								type="text"
								value={custom}
								onChange={(e) => setCustom(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter") addCustom();
								}}
								placeholder="agent-name"
								className={`flex-1 rounded border px-2 py-1 font-mono text-xs ${inputCls}`}
							/>
							<button
								type="button"
								onClick={addCustom}
								disabled={!custom.trim() || !TEAM_ID_RE.test(custom.trim()) || existing.has(custom.trim())}
								className="rounded bg-[#ea580c] px-2 py-1 text-xs font-bold text-white disabled:opacity-40 hover:bg-[#c2410c]"
							>
								Add
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

/** A single team card — shows members as pill tags, lets user add/remove. */
function TeamCard({
	teamName,
	members,
	agents,
	appearanceDark,
	onMemberRemove,
	onMemberAdd,
	onDeleteTeam,
}: {
	teamName: string;
	members: string[];
	agents: AgentMeta[];
	appearanceDark: boolean;
	onMemberRemove: (member: string) => void;
	onMemberAdd: (member: string) => void;
	onDeleteTeam: () => void;
}) {
	const agentNames = new Set(agents.map((a) => a.name));
	const existingSet = new Set(members);
	const card = appearanceDark
		? "border-[#3c3c3c] bg-[#1e1e1e]"
		: "border-[#e5e5e5] bg-[#fafafa] shadow-sm";
	const nameColor = appearanceDark ? "text-[#cccccc]" : "text-[#333333]";

	return (
		<div className={`rounded-2xl border p-4 ${card}`}>
			<div className="mb-3 flex items-center justify-between gap-2">
				<div className="flex items-center gap-2">
					<Users size={16} className="shrink-0 text-[#ea580c]" />
					<span className={`font-bold ${nameColor}`}>{teamName}</span>
					<span className="rounded-full bg-[#ea580c]/15 px-2 py-0.5 text-[11px] font-semibold text-[#fb923c]">
						{members.length} {members.length === 1 ? "member" : "members"}
					</span>
				</div>
				<button
					type="button"
					onClick={onDeleteTeam}
					title="Delete this team"
					className="flex items-center gap-1 rounded-lg border border-red-500/25 px-2 py-1 text-[11px] font-bold text-red-400 hover:bg-red-500/10 hover:border-red-500/50"
				>
					<Trash2 size={11} />
					Delete team
				</button>
			</div>

			{members.length === 0 ? (
				<p className="mb-3 text-xs text-[#858585] italic">No members yet — add some below!</p>
			) : (
				<div className="mb-3 flex flex-wrap gap-2">
					{members.map((m) => {
						const known = agentNames.has(m);
						return (
							<span
								key={m}
								className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
									known
										? appearanceDark
											? "border-[#ea580c]/40 bg-[#ea580c]/15 text-[#fed7aa]"
											: "border-[#ea580c]/40 bg-[#ea580c]/10 text-[#c2410c]"
										: appearanceDark
											? "border-[#6f6f6f]/50 bg-[#3c3c3c] text-[#858585]"
											: "border-[#d4d4d4] bg-[#f0f0f0] text-[#616161]"
								}`}
							>
								{m}
								{!known && (
									<span className="text-[10px] opacity-70" title="No agent file found for this name">
										(missing)
									</span>
								)}
								<button
									type="button"
									onClick={() => onMemberRemove(m)}
									title={`Remove ${m} from team`}
									className="ml-0.5 rounded-full p-0.5 opacity-60 hover:opacity-100"
									aria-label={`Remove ${m}`}
								>
									<X size={10} />
								</button>
							</span>
						);
					})}
				</div>
			)}

			<AddMemberDropdown
				agents={agents}
				existing={existingSet}
				appearanceDark={appearanceDark}
				onAdd={onMemberAdd}
			/>
		</div>
	);
}

/** New-team inline form at the top of the list. */
function NewTeamForm({
	existingNames,
	appearanceDark,
	onAdd,
	onCancel,
}: {
	existingNames: Set<string>;
	appearanceDark: boolean;
	onAdd: (name: string) => void;
	onCancel: () => void;
}) {
	const [name, setName] = useState("");
	const valid = name.trim() && TEAM_ID_RE.test(name.trim()) && !existingNames.has(name.trim());
	const inputCls = appearanceDark
		? "bg-[#1e1e1e] border-[#454545] text-[#cccccc] placeholder-[#6b6b6b]"
		: "bg-white border-[#d4d4d4] text-[#333333] placeholder-[#999]";

	return (
		<div
			className={`flex items-center gap-2 rounded-2xl border p-3 ${appearanceDark ? "border-[#ea580c]/40 bg-[#ea580c]/8" : "border-[#ea580c]/30 bg-[#ea580c]/5"}`}
		>
			<input
				autoFocus
				type="text"
				value={name}
				onChange={(e) => setName(e.target.value)}
				onKeyDown={(e) => {
					if (e.key === "Enter" && valid) onAdd(name.trim());
					if (e.key === "Escape") onCancel();
				}}
				placeholder="Team name (e.g. my-squad)"
				className={`flex-1 rounded-lg border px-3 py-2 font-mono text-sm ${inputCls}`}
			/>
			<button
				type="button"
				disabled={!valid}
				onClick={() => { if (valid) onAdd(name.trim()); }}
				className="flex items-center gap-1 rounded-lg bg-[#ea580c] px-3 py-2 text-sm font-bold text-white disabled:opacity-40 hover:bg-[#c2410c]"
			>
				<Check size={14} />
				Create
			</button>
			<button
				type="button"
				onClick={onCancel}
				className={`rounded-lg border px-3 py-2 text-sm font-bold ${appearanceDark ? "border-[#6f6f6f] text-[#cccccc]" : "border-[#d4d4d4] text-[#333333]"}`}
			>
				Cancel
			</button>
		</div>
	);
}

/**
 * Full GUI modal for editing `.pi/agents/teams.yaml` — no YAML knowledge required.
 * Opens when the user clicks "Edit YAML" in My AI Team.
 */
export function TeamsGuiEditorModal({
	open,
	onClose,
	agents,
	teamsYamlWritePath,
	workspaceReady,
	appearanceDark,
	onAfterSave,
}: {
	open: boolean;
	onClose: () => void;
	agents: AgentMeta[];
	teamsYamlWritePath: string;
	workspaceReady: boolean;
	appearanceDark: boolean;
	onAfterSave: () => void | Promise<void>;
}) {
	const [teams, setTeams] = useState<Record<string, string[]>>({});
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [saved, setSaved] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [showNewTeam, setShowNewTeam] = useState(false);

	// Load on open
	useEffect(() => {
		if (!open) return;
		setSaved(false);
		setError(null);
		setShowNewTeam(false);
		setLoading(true);
		fetchTeamsFromFile(teamsYamlWritePath).then((loaded) => {
			setTeams(loaded ?? {});
			setLoading(false);
		});
	}, [open, teamsYamlWritePath]);

	const addTeam = useCallback((name: string) => {
		setTeams((prev) => ({ ...prev, [name]: [] }));
		setShowNewTeam(false);
	}, []);

	const deleteTeam = useCallback((name: string) => {
		if (!window.confirm(`Delete the team "${name}"?\n\nThis removes it from your team list — it won't delete any agent files.`)) return;
		setTeams((prev) => {
			const next = { ...prev };
			delete next[name];
			return next;
		});
	}, []);

	const addMember = useCallback((teamName: string, member: string) => {
		setTeams((prev) => ({
			...prev,
			[teamName]: [...(prev[teamName] ?? []), member],
		}));
	}, []);

	const removeMember = useCallback((teamName: string, member: string) => {
		setTeams((prev) => ({
			...prev,
			[teamName]: (prev[teamName] ?? []).filter((m) => m !== member),
		}));
	}, []);

	const save = useCallback(async () => {
		if (!workspaceReady) {
			setError("Open a workspace folder first.");
			return;
		}
		setSaving(true);
		setError(null);
		try {
			const yaml = serializeTeamsYaml(teams);
			await apiPutJson<{ ok: boolean }>("/api/file", {
				path: teamsYamlWritePath,
				content: yaml,
			});
			setSaved(true);
			await onAfterSave();
			setTimeout(() => {
				onClose();
			}, 600);
		} catch (e) {
			setError(e instanceof Error ? e.message : String(e));
		} finally {
			setSaving(false);
		}
	}, [workspaceReady, teams, teamsYamlWritePath, onAfterSave, onClose]);

	if (!open) return null;

	const portalTarget = typeof document !== "undefined" ? document.body : null;
	if (!portalTarget) return null;

	const panel = appearanceDark
		? "border-[#3c3c3c] bg-[#252526] text-[#cccccc]"
		: "border-[#e5e5e5] bg-white text-[#333333]";
	const muted = appearanceDark ? "text-[#858585]" : "text-[#616161]";
	const borderB = appearanceDark ? "border-[#3c3c3c]" : "border-[#e5e5e5]";
	const ghostBtn = appearanceDark
		? "border border-[#3c3c3c] text-[#cccccc] hover:bg-[#3c3c3c]"
		: "border border-[#d4d4d4] text-[#333333] hover:bg-[#f0f0f0]";
	const teamCount = Object.keys(teams).length;

	return createPortal(
		<div
			className="fixed inset-0 z-[20000] flex items-center justify-center bg-black/65 p-4"
			role="presentation"
			onMouseDown={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div
				className={`flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border shadow-2xl ${panel}`}
				role="dialog"
				aria-labelledby="teams-editor-title"
				aria-modal="true"
				onMouseDown={(e) => e.stopPropagation()}
			>
			{/* Header */}
			<div className={`flex shrink-0 items-start justify-between border-b px-5 py-4 ${borderB}`}>
				<div>
					<h2 id="teams-editor-title" className="text-lg font-bold">
						Edit My AI Team
					</h2>
					<p className={`mt-1 text-sm leading-relaxed ${muted}`}>
						Add or remove agents from your teams. No coding needed — just click!
					</p>
				</div>
				<button
					type="button"
					onClick={onClose}
					className={`ml-3 shrink-0 rounded-lg p-1.5 ${appearanceDark ? "text-[#858585] hover:bg-[#3c3c3c]" : "text-[#616161] hover:bg-[#f0f0f0]"}`}
					aria-label="Close"
				>
					<X size={20} />
				</button>
			</div>

			{/* Plain-English explainer */}
			<div className={`shrink-0 border-b px-5 py-4 ${borderB} ${appearanceDark ? "bg-[#1e1e1e]" : "bg-[#f8f8f8]"}`}>
				<div className="flex flex-col gap-3 sm:flex-row sm:gap-5">
					<div className="flex items-start gap-3">
						<div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${appearanceDark ? "bg-[#ea580c]/15" : "bg-[#ea580c]/10"}`}>
							<BotMessageSquare size={16} className="text-[#ea580c]" />
						</div>
						<div>
							<p className={`text-xs font-bold uppercase tracking-wide ${appearanceDark ? "text-[#d4d4d4]" : "text-[#444]"}`}>
								What is an agent?
							</p>
							<p className={`mt-0.5 text-xs leading-relaxed ${muted}`}>
								An <strong className={appearanceDark ? "text-[#cccccc]" : "text-[#333]"}>agent</strong> is an AI helper with a specific job — like a <em>Planner</em> who maps out a strategy, a <em>Builder</em> who writes the code, or a <em>Reviewer</em> who checks the work. Each agent has its own personality and skills.
							</p>
						</div>
					</div>
					<div className="flex items-start gap-3">
						<div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${appearanceDark ? "bg-[#ea580c]/15" : "bg-[#ea580c]/10"}`}>
							<Users size={16} className="text-[#ea580c]" />
						</div>
						<div>
							<p className={`text-xs font-bold uppercase tracking-wide ${appearanceDark ? "text-[#d4d4d4]" : "text-[#444]"}`}>
								What is a team?
							</p>
							<p className={`mt-0.5 text-xs leading-relaxed ${muted}`}>
								A <strong className={appearanceDark ? "text-[#cccccc]" : "text-[#333]"}>team</strong> is a group of agents that work together on a task. Think of it like choosing your squad before starting a game — you pick who's on the team, then the AI figures out who does what.
							</p>
						</div>
					</div>
					<div className="flex items-start gap-3">
						<div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${appearanceDark ? "bg-[#ea580c]/15" : "bg-[#ea580c]/10"}`}>
							<Info size={16} className="text-[#ea580c]" />
						</div>
						<div>
							<p className={`text-xs font-bold uppercase tracking-wide ${appearanceDark ? "text-[#d4d4d4]" : "text-[#444]"}`}>
								How to use this
							</p>
							<p className={`mt-0.5 text-xs leading-relaxed ${muted}`}>
								Click <strong className={appearanceDark ? "text-[#cccccc]" : "text-[#333]"}>+ Add member</strong> on any team to add an agent. Hit the <strong className={appearanceDark ? "text-[#cccccc]" : "text-[#333]"}>✕</strong> on a name to remove them. Press <strong className={appearanceDark ? "text-[#cccccc]" : "text-[#333]"}>Save changes</strong> when you're done — nothing changes until you save!
							</p>
						</div>
					</div>
				</div>
			</div>

				{/* Toolbar */}
				<div className={`shrink-0 flex items-center justify-between gap-3 border-b px-5 py-3 ${borderB}`}>
					<span className={`text-sm font-semibold ${muted}`}>
						{loading ? "Loading…" : `${teamCount} ${teamCount === 1 ? "team" : "teams"}`}
					</span>
					<button
						type="button"
						disabled={loading || showNewTeam}
						onClick={() => setShowNewTeam(true)}
						className="flex items-center gap-1.5 rounded-xl bg-[#ea580c] px-4 py-2 text-sm font-bold text-white disabled:opacity-50 hover:bg-[#c2410c]"
					>
						<Plus size={16} />
						New team
					</button>
				</div>

				{/* Body */}
				<div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
					{loading ? (
						<div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
							<div className="h-8 w-8 animate-spin rounded-full border-2 border-[#ea580c] border-t-transparent" />
							<p className={`text-sm ${muted}`}>Loading your teams…</p>
						</div>
					) : (
						<div className="flex flex-col gap-4">
							{showNewTeam && (
								<NewTeamForm
									existingNames={new Set(Object.keys(teams))}
									appearanceDark={appearanceDark}
									onAdd={addTeam}
									onCancel={() => setShowNewTeam(false)}
								/>
							)}

							{teamCount === 0 && !showNewTeam ? (
								<div className={`rounded-2xl border border-dashed p-8 text-center ${appearanceDark ? "border-[#3c3c3c]" : "border-[#d4d4d4]"}`}>
									<Users size={32} className="mx-auto mb-3 text-[#ea580c]/60" />
									<p className={`mb-1 font-bold ${appearanceDark ? "text-[#cccccc]" : "text-[#333333]"}`}>
										No teams yet
									</p>
									<p className={`text-sm ${muted}`}>
										Click <strong>New team</strong> above to create your first team!
									</p>
								</div>
							) : (
								Object.entries(teams).map(([teamName, members]) => (
									<TeamCard
										key={teamName}
										teamName={teamName}
										members={members}
										agents={agents}
										appearanceDark={appearanceDark}
										onMemberRemove={(m) => removeMember(teamName, m)}
										onMemberAdd={(m) => addMember(teamName, m)}
										onDeleteTeam={() => deleteTeam(teamName)}
									/>
								))
							)}
						</div>
					)}
				</div>

				{/* Error */}
				{error ? (
					<div className="shrink-0 px-5 py-2">
						<p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-400">{error}</p>
					</div>
				) : null}

				{/* Footer */}
				<div className={`shrink-0 flex items-center justify-between gap-3 border-t px-5 py-4 ${borderB}`}>
					<p className={`text-xs ${muted}`}>
						Saves to{" "}
						<code className="break-all font-mono text-[11px]">{teamsYamlWritePath}</code>
					</p>
					<div className="flex shrink-0 gap-2">
						<button
							type="button"
							disabled={saving}
							onClick={onClose}
							className={`rounded-xl px-4 py-2 text-sm font-bold ${ghostBtn}`}
						>
							Cancel
						</button>
						<button
							type="button"
							disabled={saving || loading || !workspaceReady}
							onClick={() => void save()}
							className={`flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-bold text-white disabled:opacity-50 transition-colors ${
								saved ? "bg-green-600 hover:bg-green-700" : "bg-[#ea580c] hover:bg-[#c2410c]"
							}`}
						>
							{saved ? (
								<>
									<Check size={16} />
									Saved!
								</>
							) : saving ? (
								"Saving…"
							) : (
								"Save changes"
							)}
						</button>
					</div>
				</div>
			</div>
		</div>,
		portalTarget,
	);
}
