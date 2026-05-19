import { BookOpen, Cpu, Database, Pencil, Plus, RefreshCw, Trash2, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiGet, apiPutJson } from "../../api/client";
import type { AgentMeta } from "../../hooks/useAgents";
import { workspaceAgentDisplayName } from "../../utils/workspaceAgentDisplay";
import type { FileGetResponse } from "../../types/workspaceFile";
import { parseTeamsYaml, serializeTeamsYaml } from "../../utils/teamsYaml";
import { TeamsGuiEditorModal } from "../TeamsGuiEditorModal";

const TEAM_ID_RE = /^[a-zA-Z0-9_-]+$/;

function modalPanelClass(appearanceDark: boolean) {
	return appearanceDark
		? "border-[#3c3c3c] bg-[#252526] text-[#cccccc]"
		: "border-[#e5e5e5] bg-white text-[#333333]";
}

function mutedClass(appearanceDark: boolean) {
	return appearanceDark ? "text-[#858585]" : "text-[#616161]";
}

async function fetchTeamsFromFile(path: string): Promise<Record<string, string[]> | null> {
	try {
		const r = await apiGet<FileGetResponse>(`/api/file?path=${encodeURIComponent(path)}`);
		if ("encoding" in r && r.encoding === "base64") return null;
		return parseTeamsYaml(r.content);
	} catch {
		return null;
	}
}

function TeamRosterModal({
	open,
	onClose,
	appearanceDark,
	mode,
	editTeamName,
	agents,
	teams,
	teamsYamlWritePath,
	workspaceReady,
	onAfterSave,
}: {
	open: boolean;
	onClose: () => void;
	appearanceDark: boolean;
	mode: "new" | "edit";
	editTeamName?: string;
	agents: AgentMeta[];
	teams: Record<string, string[]>;
	teamsYamlWritePath: string;
	workspaceReady: boolean;
	onAfterSave: () => void | Promise<void>;
}) {
	const [newTeamName, setNewTeamName] = useState("");
	const [selected, setSelected] = useState<Set<string>>(() => new Set());
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!open) return;
		setError(null);
		if (mode === "edit" && editTeamName) {
			setNewTeamName("");
			setSelected(new Set(teams[editTeamName] ?? []));
		} else {
			setNewTeamName("");
			setSelected(new Set());
		}
	}, [open, mode, editTeamName, teams]);

	const toggleAgent = useCallback((name: string) => {
		setSelected((prev) => {
			const next = new Set(prev);
			if (next.has(name)) next.delete(name);
			else next.add(name);
			return next;
		});
	}, []);

	const persist = useCallback(
		async (nextTeams: Record<string, string[]>) => {
			setSaving(true);
			setError(null);
			try {
				const yaml = serializeTeamsYaml(nextTeams);
				await apiPutJson<{ ok: boolean }>("/api/file", {
					path: teamsYamlWritePath,
					content: yaml,
				});
				await onAfterSave();
				onClose();
			} catch (e) {
				setError(e instanceof Error ? e.message : String(e));
			} finally {
				setSaving(false);
			}
		},
		[onAfterSave, onClose, teamsYamlWritePath],
	);

	const onSubmit = useCallback(async () => {
		if (!workspaceReady) {
			setError("Open a workspace folder first.");
			return;
		}
		let fileTeams = await fetchTeamsFromFile(teamsYamlWritePath);
		if (!fileTeams) fileTeams = { ...teams };

		if (mode === "new") {
			const id = newTeamName.trim();
			if (!id || !TEAM_ID_RE.test(id)) {
				setError("Team id: letters, numbers, hyphen, underscore only.");
				return;
			}
			if (fileTeams[id] != null || teams[id] != null) {
				setError(`Team "${id}" already exists.`);
				return;
			}
			const next = { ...fileTeams, [id]: [...selected] };
			await persist(next);
			return;
		}

		if (!editTeamName) return;
		const next = { ...fileTeams, [editTeamName]: [...selected] };
		await persist(next);
	}, [workspaceReady, teamsYamlWritePath, teams, mode, newTeamName, selected, editTeamName, persist]);

	const onRemoveTeam = useCallback(async () => {
		if (!editTeamName || !workspaceReady) return;
		if (!window.confirm(`Remove team "${editTeamName}" from teams.yaml?`)) return;
		let fileTeams = await fetchTeamsFromFile(teamsYamlWritePath);
		if (!fileTeams) fileTeams = { ...teams };
		const { [editTeamName]: _, ...rest } = fileTeams;
		await persist(rest);
	}, [editTeamName, workspaceReady, teamsYamlWritePath, teams, persist]);

	const sortedAgents = useMemo(() => [...agents].sort((a, b) => a.name.localeCompare(b.name)), [agents]);

	if (!open) return null;

	const panel = modalPanelClass(appearanceDark);
	const muted = mutedClass(appearanceDark);

	return (
		<div
			className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4"
			role="presentation"
			onMouseDown={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div className={`max-h-[min(90vh,640px)] w-full max-w-lg overflow-hidden rounded-xl border shadow-2xl ${panel}`} role="dialog">
				<div className="border-b border-[#3c3c3c]/50 px-5 py-4">
					<h2 className="text-lg font-bold">
						{mode === "new" ? "New team" : `Edit team: ${editTeamName}`}
					</h2>
					<p className={`mt-1 text-xs ${muted}`}>
						Members must match agent <code className="rounded bg-black/10 px-1">name</code> in Markdown frontmatter.
						File: <code className="break-all">{teamsYamlWritePath}</code>
					</p>
				</div>

				<div className="max-h-[min(52vh,420px)] overflow-y-auto px-5 py-3">
					{mode === "new" ? (
						<label className="mb-3 block">
							<span className={`mb-1 block text-xs font-bold uppercase tracking-wide ${muted}`}>Team id</span>
							<input
								type="text"
								value={newTeamName}
								onChange={(e) => setNewTeamName(e.target.value)}
								placeholder="e.g. my-squad"
								className={`w-full rounded border px-3 py-2 font-mono text-sm ${
									appearanceDark
										? "border-[#454545] bg-[#1e1e1e] text-[#cccccc]"
										: "border-[#d4d4d4] bg-white text-[#333333]"
								}`}
							/>
						</label>
					) : null}

					<p className={`mb-2 text-xs font-bold uppercase tracking-wide ${muted}`}>Roster</p>
					{sortedAgents.length === 0 ? (
						<p className={`text-sm ${muted}`}>No agents found in the workspace. Add `.md` files under the scan roots.</p>
					) : (
						<ul className="space-y-1">
							{sortedAgents.map((a) => (
								<li key={a.name}>
									<label
										className={`flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 text-sm ${
											appearanceDark ? "hover:bg-[#3c3c3c]" : "hover:bg-[#f0f0f0]"
										}`}
									>
										<input
											type="checkbox"
											checked={selected.has(a.name)}
											onChange={() => toggleAgent(a.name)}
											className="mt-1"
										/>
										<span>
											<span className="font-semibold">{workspaceAgentDisplayName(a.name)}</span>
											<span className="ml-1 font-mono text-[11px] opacity-80">({a.name})</span>
											{a.description ? (
												<span className={`mt-0.5 block text-xs ${muted}`}>{a.description}</span>
											) : null}
										</span>
									</label>
								</li>
							))}
						</ul>
					)}
				</div>

				{error ? <p className="px-5 text-sm text-red-400">{error}</p> : null}

				<div className="flex flex-wrap items-center gap-2 border-t border-[#3c3c3c]/50 px-5 py-4">
					<button
						type="button"
						disabled={saving || !workspaceReady}
						onClick={() => void onSubmit()}
						className="rounded-lg bg-[#ea580c] px-4 py-2 text-sm font-bold text-white hover:bg-[#c2410c] disabled:opacity-50"
					>
						{saving ? "Saving…" : "Save teams.yaml"}
					</button>
					<button
						type="button"
						disabled={saving}
						onClick={onClose}
						className={`rounded-lg border px-4 py-2 text-sm font-bold ${appearanceDark ? "border-[#6f6f6f] text-[#cccccc]" : "border-[#d4d4d4] text-[#333333]"}`}
					>
						Cancel
					</button>
					{mode === "edit" && editTeamName ? (
						<button
							type="button"
							disabled={saving || !workspaceReady}
							onClick={() => void onRemoveTeam()}
							className="ml-auto flex items-center gap-1 rounded-lg border border-red-500/40 px-3 py-2 text-sm font-bold text-red-400 hover:bg-red-500/10 disabled:opacity-50"
						>
							<Trash2 size={14} />
							Remove team
						</button>
					) : null}
				</div>
			</div>
		</div>
	);
}

function AddAgentHintModal({
	open,
	onClose,
	onReload,
	onCreateAgentFile,
	onOpenTeamsYaml,
	appearanceDark,
}: {
	open: boolean;
	onClose: () => void;
	onReload: () => void;
	onCreateAgentFile?: () => void;
	onOpenTeamsYaml?: () => void;
	appearanceDark: boolean;
}) {
	if (!open) return null;
	const panel = modalPanelClass(appearanceDark);
	const muted = mutedClass(appearanceDark);
	return (
		<div
			className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4"
			role="presentation"
			onMouseDown={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div className={`max-w-md rounded-xl border p-6 shadow-2xl ${panel}`} role="dialog">
				<h2 className="text-lg font-bold">Add an agent</h2>
				<p className={`mt-2 text-sm leading-relaxed ${muted}`}>
					Agents are Markdown with YAML frontmatter (<code className="rounded bg-black/10 px-1">name</code>,{" "}
					<code className="rounded bg-black/10 px-1">description</code>, <code className="rounded bg-black/10 px-1">tools</code>
					, …) under <code className="rounded bg-black/10 px-1">agents/</code>,{" "}
					<code className="rounded bg-black/10 px-1">.claude/agents/</code>,{" "}
					<code className="rounded bg-black/10 px-1">.pi/agents/</code>, or{" "}
					<code className="rounded bg-black/10 px-1">.cursor/agents/</code> (Pi agent-team scan order; first{" "}
					<code className="rounded bg-black/10 px-1">name</code> wins). Rosters:{" "}
					<code className="rounded bg-black/10 px-1">.pi/agents/teams.yaml</code>.
				</p>
				<p className={`mt-2 text-sm ${muted}`}>
					Edit the body below the frontmatter for the agent&apos;s system prompt. See <span className="font-mono text-xs">docs/AGENTS.md</span>.
				</p>
				<div className="mt-4 flex flex-wrap gap-2">
					{onCreateAgentFile ? (
						<button
							type="button"
							onClick={() => {
								onCreateAgentFile();
								onClose();
							}}
							className="rounded-lg bg-[#ea580c] px-4 py-2 text-sm font-bold text-white hover:bg-[#c2410c]"
						>
							New agent file…
						</button>
					) : null}
					{onOpenTeamsYaml ? (
						<button
							type="button"
							onClick={() => {
								onOpenTeamsYaml();
								onClose();
							}}
							className={`rounded-lg border px-4 py-2 text-sm font-bold ${appearanceDark ? "border-[#6f6f6f] text-[#cccccc]" : "border-[#d4d4d4] text-[#333333]"}`}
						>
							Open teams.yaml
						</button>
					) : null}
					<button
						type="button"
						onClick={() => {
							onReload();
						}}
						className={`rounded-lg border px-4 py-2 text-sm font-bold ${appearanceDark ? "border-[#6f6f6f] text-[#cccccc]" : "border-[#d4d4d4] text-[#333333]"}`}
					>
						Reload catalog
					</button>
					<button
						type="button"
						onClick={onClose}
						className={`rounded-lg border px-4 py-2 text-sm font-bold ${appearanceDark ? "border-[#6f6f6f] text-[#cccccc]" : "border-[#d4d4d4] text-[#333333]"}`}
					>
						Close
					</button>
				</div>
			</div>
		</div>
	);
}

/** Simple shell — `/api/agents` roster + chat persona merge; edit teams.yaml and agent `.md` prompts in the workspace. */
export function SimpleTeamView({
	modelLabel,
	agents,
	teams,
	teamsPath,
	teamsYamlWritePath,
	workspaceReady,
	loading,
	error,
	onReload,
	onOpenAgentFile,
	onOpenTeamsYaml,
	onCreateAgentDefinition,
	appearanceDark,
}: {
	modelLabel: string;
	agents: AgentMeta[];
	teams: Record<string, string[]>;
	teamsPath: string | null;
	/** Relative path used for GET/PUT `teams.yaml` (from API or default). */
	teamsYamlWritePath: string;
	workspaceReady: boolean;
	loading: boolean;
	error: string | null;
	onReload: () => void;
	onOpenAgentFile: (relativePath: string) => void;
	onOpenTeamsYaml?: () => void;
	onCreateAgentDefinition?: () => void;
	appearanceDark: boolean;
}) {
	const [hireOpen, setHireOpen] = useState(false);
	const [teamModal, setTeamModal] = useState<null | { mode: "new" | "edit"; team?: string }>(null);
	const [teamsGuiOpen, setTeamsGuiOpen] = useState(false);
	const byName = new Map(agents.map((a) => [a.name, a]));
	const heading = appearanceDark ? "text-[#cccccc]" : "text-[#333333]";
	const sub = appearanceDark ? "text-[#858585]" : "text-[#616161]";
	const card = appearanceDark
		? "border-[#3c3c3c] bg-[#252526]"
		: "border-[#e5e5e5] bg-white shadow-sm";

	const pathLabel = teamsPath ?? ".pi/agents/teams.yaml";

	return (
		<div className="flex-1 overflow-y-auto p-8">
			<div className="mx-auto max-w-4xl">
				<div className="mb-6 flex flex-wrap items-start justify-between gap-4">
					<div>
						<h1 className={`mb-2 text-2xl font-extrabold ${heading}`}>My AI Team</h1>
						<p className={`font-medium ${sub}`}>
							Agents discovered under <code className="text-xs">agents/</code>, <code className="text-xs">.claude/agents</code>,{" "}
							<code className="text-xs">.pi/agents</code>, and <code className="text-xs">.cursor/agents</code> (Pi agent-team order; duplicate{" "}
							<code className="text-xs">name</code> keeps the first). Rosters: <code className="text-xs">{pathLabel}</code>.
						</p>
						<p className={`mt-2 text-sm ${sub}`}>
							Create or edit teams here (rewrites <code className="text-xs">teams.yaml</code>). Use <strong className={heading}>Edit prompt</strong> on
							an agent to change its Markdown body and frontmatter.
						</p>
					</div>
					<div className="flex flex-wrap gap-2">
						<button
							type="button"
							onClick={() => setTeamModal({ mode: "new" })}
							disabled={!workspaceReady}
							title={!workspaceReady ? "Open a workspace folder first" : undefined}
							className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold transition-colors disabled:opacity-50 ${appearanceDark ? "border-[#ea580c]/50 text-[#fed7aa] hover:bg-[#ea580c]/15" : "border-[#ea580c]/40 text-[#c2410c] hover:bg-[#ea580c]/10"}`}
						>
							<Plus size={16} />
							New team
						</button>
						<button
							type="button"
							onClick={() => setTeamsGuiOpen(true)}
							disabled={!workspaceReady}
							title={!workspaceReady ? "Open a workspace folder first" : "Edit teams with a visual editor"}
							className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold transition-colors disabled:opacity-50 ${appearanceDark ? "border-[#3c3c3c] text-[#cccccc] hover:bg-[#3c3c3c]" : "border-[#d4d4d4] text-[#333333] hover:bg-[#e5e5e5]"}`}
						>
							<Pencil size={16} />
							Edit Teams
						</button>
						<button
							type="button"
							onClick={onReload}
							disabled={loading}
							className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold transition-colors disabled:opacity-50 ${appearanceDark ? "border-[#3c3c3c] text-[#cccccc] hover:bg-[#3c3c3c]" : "border-[#d4d4d4] text-[#333333] hover:bg-[#e5e5e5]"}`}
						>
							<RefreshCw size={16} className={loading ? "animate-spin" : ""} />
							Refresh
						</button>
					</div>
				</div>

				{error ? <p className="mb-4 text-sm text-red-400">{error}</p> : null}
				{loading && agents.length === 0 ? <p className={sub}>Loading agents…</p> : null}

				<section className="mb-10">
					<h2 className={`mb-3 flex items-center gap-2 text-lg font-bold ${heading}`}>
						<BookOpen size={18} /> Teams
					</h2>
					{Object.keys(teams).length === 0 ? (
						<p className={`mb-3 text-sm ${sub}`}>
							No teams in <code className="text-xs">{pathLabel}</code> yet. Create a team and pick agents, or paste YAML with{" "}
							<strong className={heading}>Edit YAML</strong>.
						</p>
					) : (
						<div className="flex flex-col gap-3">
							{Object.entries(teams).map(([team, members]) => (
								<div key={team} className={`rounded-2xl border p-4 ${card}`}>
									<div className="mb-2 flex flex-wrap items-center justify-between gap-2">
										<div className={`font-mono text-sm font-bold ${heading}`}>{team}</div>
										<button
											type="button"
											disabled={!workspaceReady}
											onClick={() => setTeamModal({ mode: "edit", team })}
											className={`text-xs font-bold uppercase tracking-wide text-[#fb923c] hover:text-[#fed7aa] disabled:opacity-50`}
										>
											Edit roster
										</button>
									</div>
									<div className="flex flex-wrap gap-2">
										{members.map((m) => {
											const meta = byName.get(m);
											return (
												<button
													key={m}
													type="button"
													onClick={() => {
														if (meta && meta.relativePath) onOpenAgentFile(meta.relativePath);
													}}
													className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
														meta
															? appearanceDark
																? "border-[#ea580c]/40 bg-[#ea580c]/15 text-[#fed7aa] hover:bg-[#ea580c]/25"
																: "border-[#ea580c]/40 bg-[#ea580c]/10 text-[#c2410c] hover:bg-[#ea580c]/15"
															: appearanceDark
																? "border-[#6f6f6f] text-[#858585]"
																: "border-[#d4d4d4] text-[#616161]"
													}`}
													title={meta ? `${meta.description || ""} — click to edit prompt` : "No matching agent file in workspace"}
												>
													{m}
													{!meta ? " (missing)" : ""}
												</button>
											);
										})}
									</div>
								</div>
							))}
						</div>
					)}
				</section>

				<section>
					<h2 className={`mb-4 text-lg font-bold ${heading}`}>All agents ({agents.length})</h2>
					<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
						<button
							type="button"
							onClick={() => setHireOpen(true)}
							className={`flex min-h-[160px] flex-col items-center justify-center rounded-2xl border border-dashed p-6 transition-colors ${appearanceDark ? "border-[#3c3c3c] bg-[#252526]/50 text-[#858585] hover:border-[#6f6f6f] hover:bg-[#3c3c3c]/50 hover:text-[#cccccc]" : "border-[#d4d4d4] bg-[#f3f3f3] text-[#616161] hover:border-[#c8c8c8] hover:bg-[#e5e5e5] hover:text-[#333333]"}`}
						>
							<Users size={28} className="mb-2" />
							<span className="font-bold">Add agent</span>
							<span className={`mt-1 text-center text-xs ${sub}`}>New Markdown file or open YAML</span>
						</button>
						{agents.map((agent) => (
							<div key={agent.name} className={`flex flex-col rounded-2xl border p-6 shadow-sm ${card}`}>
								<div className="mb-4 flex items-start justify-between gap-2">
									<div className="flex min-w-0 items-center gap-3">
										<div
											className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${appearanceDark ? "border-[#3c3c3c] bg-[#3c3c3c] text-[#cccccc]" : "border-[#e5e5e5] bg-[#ececec] text-[#616161]"}`}
										>
											<Cpu size={20} />
										</div>
										<div className="min-w-0">
											<h3 className={`truncate font-bold ${heading}`}>
												{workspaceAgentDisplayName(agent.name)}
											</h3>
											<p className={`line-clamp-2 text-xs ${sub}`}>{agent.description || "—"}</p>
										</div>
									</div>
									<span
										className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${appearanceDark ? "border-green-500/30 bg-green-500/15 text-green-400" : "border-green-600/30 bg-green-50 text-green-800"}`}
									>
										ready
									</span>
								</div>
								{agent.tools ? (
									<p className={`mb-2 truncate font-mono text-[11px] ${sub}`} title={agent.tools?.join(", ")}>
										tools: {agent.tools?.join(", ")}
									</p>
								) : null}
								<p className={`mb-3 text-xs ${sub}`}>
									<code className="break-all text-[11px]">{agent.relativePath}</code>
								</p>
								<div className={`mt-auto flex items-center justify-between border-t pt-4 text-sm ${appearanceDark ? "border-[#3c3c3c]" : "border-[#e5e5e5]"}`}>
									<span className={`flex min-w-0 items-center gap-1.5 truncate ${sub}`}>
										<Database size={14} className="shrink-0" />
										<span className="truncate">{modelLabel || "—"}</span>
									</span>
									<button
										type="button"
										onClick={() => agent.relativePath && onOpenAgentFile(agent.relativePath)}
										className="shrink-0 text-xs font-bold uppercase tracking-wide text-[#fb923c] hover:text-[#fed7aa]"
									>
										Edit prompt
									</button>
								</div>
							</div>
						))}
					</div>
				</section>
			</div>

			<TeamRosterModal
				open={teamModal != null}
				onClose={() => setTeamModal(null)}
				appearanceDark={appearanceDark}
				mode={teamModal?.mode ?? "new"}
				editTeamName={teamModal?.team}
				agents={agents}
				teams={teams}
				teamsYamlWritePath={teamsYamlWritePath}
				workspaceReady={workspaceReady}
				onAfterSave={() => void onReload()}
			/>

		<AddAgentHintModal
			open={hireOpen}
			onClose={() => setHireOpen(false)}
			onReload={() => {
				void onReload();
				setHireOpen(false);
			}}
			onCreateAgentFile={onCreateAgentDefinition}
			onOpenTeamsYaml={onOpenTeamsYaml}
			appearanceDark={appearanceDark}
		/>

		<TeamsGuiEditorModal
			open={teamsGuiOpen}
			onClose={() => setTeamsGuiOpen(false)}
			agents={agents}
			teamsYamlWritePath={teamsYamlWritePath}
			workspaceReady={workspaceReady}
			appearanceDark={appearanceDark}
			onAfterSave={() => void onReload()}
		/>
	</div>
	);
}
