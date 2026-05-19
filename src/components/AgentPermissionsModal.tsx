import { useEffect, useState } from "react";
import { Shield, X } from "lucide-react";
import {
	type AgentPermissions,
	readAgentPermissions,
	writeAgentPermissions,
} from "../utils/agentPermissionsStorage";

function Toggle({
	on,
	onToggle,
	disabled,
	appearanceDark,
}: {
	on: boolean;
	onToggle: () => void;
	disabled?: boolean;
	appearanceDark: boolean;
}) {
	const trackOff = appearanceDark ? "bg-[#6f6f6f]" : "bg-[#c8c8c8]";
	return (
		<button
			type="button"
			role="switch"
			aria-checked={on}
			disabled={disabled}
			onClick={onToggle}
			className={`relative h-6 w-12 shrink-0 rounded-full transition-colors disabled:opacity-40 ${
				on ? "bg-[#ea580c]" : trackOff
			}`}
		>
			<span
				className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${on ? "right-1" : "left-1"}`}
			/>
		</button>
	);
}

function Row({
	title,
	description,
	on,
	onToggle,
	appearanceDark,
}: {
	title: string;
	description: string;
	on: boolean;
	onToggle: () => void;
	appearanceDark: boolean;
}) {
	const card = appearanceDark ? "border-[#3c3c3c] bg-[#1e1e1e]" : "border-[#e5e5e5] bg-[#fafafa]";
	const titleC = appearanceDark ? "text-[#cccccc]" : "text-[#111]";
	const desc = appearanceDark ? "text-[#858585]" : "text-[#616161]";
	return (
		<div
			className={`flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between ${card}`}
		>
			<div className="min-w-0">
				<h3 className={`text-sm font-bold ${titleC}`}>{title}</h3>
				<p className={`mt-1 text-xs leading-relaxed ${desc}`}>{description}</p>
			</div>
			<Toggle on={on} onToggle={onToggle} appearanceDark={appearanceDark} />
		</div>
	);
}

export function AgentPermissionsModal({
	open,
	onClose,
	appearanceDark,
}: {
	open: boolean;
	onClose: () => void;
	appearanceDark: boolean;
}) {
	const [perms, setPerms] = useState<AgentPermissions>(() => readAgentPermissions());

	useEffect(() => {
		if (open) setPerms(readAgentPermissions());
	}, [open]);

	const toggleKey = (key: keyof AgentPermissions) => {
		setPerms((prev) => {
			const merged = { ...prev, [key]: !prev[key] };
			writeAgentPermissions(merged);
			return merged;
		});
	};

	if (!open) return null;

	const overlay = appearanceDark ? "bg-black/55" : "bg-black/35";
	const panel = appearanceDark ? "border-[#454545] bg-[#252526] text-[#cccccc]" : "border-[#e5e5e5] bg-white text-[#333]";
	const sub = appearanceDark ? "text-[#858585]" : "text-[#616161]";

	return (
		<div
			className={`fixed inset-0 z-[200] flex items-center justify-center p-4 ${overlay}`}
			role="presentation"
			onMouseDown={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div
				className={`max-h-[90vh] w-full max-w-xl overflow-hidden rounded-xl border shadow-2xl ${panel}`}
				role="dialog"
				aria-modal
				aria-labelledby="wop-agent-perms-title"
				onMouseDown={(e) => e.stopPropagation()}
			>
				<div
					className={`flex items-center justify-between border-b px-5 py-3 ${appearanceDark ? "border-[#3c3c3c]" : "border-[#e5e5e5]"}`}
				>
					<div className="flex items-center gap-2">
						<Shield className="text-[#fb923c]" size={22} />
						<h2 id="wop-agent-perms-title" className="text-lg font-bold">
							Agent permissions
						</h2>
					</div>
					<button
						type="button"
						onClick={onClose}
						className={`rounded p-1 ${appearanceDark ? "hover:bg-[#3c3c3c]" : "hover:bg-[#f0f0f0]"}`}
						aria-label="Close"
					>
						<X size={20} />
					</button>
				</div>

				<div className="max-h-[calc(90vh-56px)] overflow-y-auto px-5 py-4">
					<p className={`mb-4 text-sm leading-relaxed ${sub}`}>
						Choose what you are comfortable letting coding agents attempt.{" "}
						<strong className={appearanceDark ? "text-[#cccccc]" : "text-[#111]"}>
							The Pi CLI and Bun server still apply their own gates
						</strong>{" "}
						(for example <code className="text-[11px]">WOP_ORCHESTRATOR_TOOLS</code>,{" "}
						<code className="text-[11px]">WOP_ORCHESTRATOR_BASH</code>, and agent frontmatter{" "}
						<code className="text-[11px]">tools:</code>). These toggles are stored in this browser and are the
						product surface for upcoming approval flows.
					</p>

					<div className="flex flex-col gap-3">
						<Row
							title="Require tool approval (preview)"
							description="When wired to the agent host, risky tools wait for your OK first. Syncs with Simple → Settings → Approval queue."
							on={perms.requireToolApproval}
							onToggle={() => toggleKey("requireToolApproval")}
							appearanceDark={appearanceDark}
						/>
						<Row
							title="Read & search workspace"
							description="Allows read, list_dir, grep-style inspection when the runtime executes Pi tools."
							on={perms.allowReadSearch}
							onToggle={() => toggleKey("allowReadSearch")}
							appearanceDark={appearanceDark}
						/>
						<Row
							title="Edit & create files"
							description="Allows write and patch operations on workspace files through agent tools."
							on={perms.allowWriteFiles}
							onToggle={() => toggleKey("allowWriteFiles")}
							appearanceDark={appearanceDark}
						/>
						<Row
							title="Run commands (host shell)"
							description="Allows bash / terminal-style execution when the server and model path expose it."
							on={perms.allowRunCommands}
							onToggle={() => toggleKey("allowRunCommands")}
							appearanceDark={appearanceDark}
						/>
						<Row
							title="Edit team rosters (orchestrator)"
							description="Allows team_member_* style changes to teams.yaml when orchestrator server tools are enabled."
							on={perms.allowTeamRosterEdits}
							onToggle={() => toggleKey("allowTeamRosterEdits")}
							appearanceDark={appearanceDark}
						/>
					</div>
				</div>
			</div>
		</div>
	);
}
