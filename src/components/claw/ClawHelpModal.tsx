/**
 * Claw Help Modal — operator guide for the Claw UI.
 *
 * Covers: what Claw is, navigation tabs, `.claw/workspace/` files,
 * schedules, channels (Telegram), files & preview, extending Claw (Pi skills,
 * tools, extensions, community), Honcho cross-session memory vs `.claw/workspace/`, ngrok sharing, and tips.
 */
import {
	AlertTriangle,
	Bot,
	CalendarDays,
	CheckCircle2,
	Cog,
	Cpu,
	Database,
	Globe,
	Files,
	FolderOpen,
	Info,
	MessageCircle,
	Puzzle,
	Radio,
	Radar,
	Users,
	X,
	Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { injectIntoChatComposer } from "../../utils/chatComposerInjectBus";
import { clawTelegramSetupChecklist } from "../../utils/clawTelegramSetupPrompt";

// ──────────────────────────────────────────────
// Tiny prose helpers
// ──────────────────────────────────────────────

function H({ children }: { children: React.ReactNode }) {
	return (
		<h3 className="mb-2 mt-5 text-[14px] font-bold text-[#e5e5e5] first:mt-0">{children}</h3>
	);
}

function P({ children }: { children: React.ReactNode }) {
	return <p className="mb-3 text-[13px] leading-relaxed text-[#aaaaaa]">{children}</p>;
}

function Code({ children }: { children: React.ReactNode }) {
	return (
		<span className="rounded border border-[#3c3c3c] bg-[#1e1e1e] px-1.5 py-0.5 font-mono text-[11px] text-[#cccccc]">
			{children}
		</span>
	);
}

function Note({
	children,
	tone = "caution",
}: {
	children: React.ReactNode;
	/** `caution` = orange warning strip (default). `success` / `info` for shipped or neutral callouts. */
	tone?: "caution" | "success" | "info";
}) {
	if (tone === "success") {
		return (
			<div className="mb-4 flex items-start gap-2.5 rounded-xl border border-[#4ec9b0]/20 bg-[#4ec9b0]/8 px-4 py-3 text-[12px] leading-relaxed text-[#cccccc]">
				<CheckCircle2 size={13} className="mt-0.5 shrink-0 text-[#4ec9b0]" />
				<span>{children}</span>
			</div>
		);
	}
	if (tone === "info") {
		return (
			<div className="mb-4 flex items-start gap-2.5 rounded-xl border border-sky-500/25 bg-sky-500/8 px-4 py-3 text-[12px] leading-relaxed text-[#cccccc]">
				<Info size={13} className="mt-0.5 shrink-0 text-sky-400" />
				<span>{children}</span>
			</div>
		);
	}
	return (
		<div className="mb-4 flex items-start gap-2.5 rounded-xl border border-[#ea580c]/25 bg-[#ea580c]/8 px-4 py-3 text-[12px] leading-relaxed text-[#cccccc]">
			<AlertTriangle size={13} className="mt-0.5 shrink-0 text-[#fb923c]" />
			<span>{children}</span>
		</div>
	);
}

function Tip({ children }: { children: React.ReactNode }) {
	return (
		<div className="mb-4 flex items-start gap-2.5 rounded-xl border border-[#4ec9b0]/20 bg-[#4ec9b0]/8 px-4 py-3 text-[12px] leading-relaxed text-[#cccccc]">
			<CheckCircle2 size={13} className="mt-0.5 shrink-0 text-[#4ec9b0]" />
			<span>{children}</span>
		</div>
	);
}

function Step({
	n,
	children,
}: {
	n: number;
	children: React.ReactNode;
}) {
	return (
		<div className="flex items-start gap-3 py-1.5">
			<span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#ea580c]/20 text-[10px] font-bold text-[#fb923c]">
				{n}
			</span>
			<span className="text-[13px] leading-relaxed text-[#aaaaaa]">{children}</span>
		</div>
	);
}

function TableRow({
	left,
	right,
}: {
	left: React.ReactNode;
	right: React.ReactNode;
}) {
	return (
		<div className="flex flex-col gap-1 border-b border-[#2a2a2a] py-2 text-[12px] last:border-0 sm:flex-row sm:gap-3">
			<span className="shrink-0 font-semibold text-[#cccccc] sm:w-32">{left}</span>
			<span className="min-w-0 text-[#858585]">{right}</span>
		</div>
	);
}

// ──────────────────────────────────────────────
// Sections
// ──────────────────────────────────────────────

function SectionOverview() {
	return (
		<>
			<H>What is Claw?</H>
			<P>
				Claw is the <strong className="text-[#fb923c]">operator shell</strong> of the{" "}
				<strong className="text-[#cccccc]">Way of Work</strong> system.
				Where <strong>Simple</strong> mode gives you a clean chat window and{" "}
				<strong>Technical</strong> mode gives you a full IDE grid, Claw is designed for
				running <strong>autonomous, persistent, and scheduled Way of Work agent tasks</strong> — with
				a mission-control dashboard, isolated workspace documents, and channel integrations.
			</P>

			<Tip>
				Think of Claw as your agent&apos;s &ldquo;home base.&rdquo; It uses the same engine
				as Simple and Technical modes — all tools, extensions, and skills work the
				same way. Only the interface and operational context differ.
			</Tip>

			<H>How Claw relates to the system</H>
			<P>
				Claw is a shell around the{" "}
				<strong className="text-[#cccccc]">Way of Work Agent</strong> — it does not replace
				it. When you chat in Claw, the agent runs your turn with its full tool set (read, write,
				bash, grep, <Code>dispatch_agent</Code>, extensions, skills). The Claw shell adds
				the operator context: workspace files, session history, schedules, and channel
				bridges.
			</P>

			<H>The three UI modes</H>
			<div className="mb-4 rounded-xl border border-[#2a2a2a] overflow-hidden">
				<TableRow left="Simple" right="Clean chat + project files. Best for casual use and onboarding." />
				<TableRow left="Technical" right="Full IDE grid with docks, git, diagnostics, and multi-panel editing." />
				<TableRow left="Claw" right="Mission-control for autonomous ops: schedules, channels, agent memory, sessions." />
			</div>
			<P>Switch modes at any time using the toggle in the top-left corner of the menu bar or via Settings.</P>

			<H>Product roadmap</H>
			<P>
				<strong className="text-[#fb923c]">Claw roadmap.</strong> Scheduled ops, inbound channels, and deep
				multi-agent orchestration are planned in phases — see <Code>docs/WOP_CLAW_MODE_PLAN.md</Code> and{" "}
				<Code>docs/WOP_CLAW_UI_PLAN.md</Code> for the build order.
			</P>

			<H>Extending Claw</H>
			<P>
				Everything powerful in Claw runs through <strong className="text-[#cccccc]">Pi</strong>{" "}
				— skills, extension tools, and community-built Pi add-ons work the same here as in the
				Pi TUI. You (or your agent) can author new capabilities, and you can pull in
				third-party skills and extensions that target the Pi Coding Agent. See the{" "}
				<strong className="text-[#fb923c]">Extending Claw</strong> section in this help
				sidebar for skills, tools, extensions, UI modules, and the open Claw / Pi ecosystem.
			</P>
		</>
	);
}

function SectionExtendingClaw() {
	return (
		<>
			<H>Built on Pi — one runtime, many surfaces</H>
			<P>
				Claw does not ship a separate agent engine. The{" "}
				<strong className="text-[#cccccc]">open Claw community</strong> and Way of Work are
				aimed at the same stack as Pi: <Code>extensions[]</Code>,{" "}
				<Code>registerTool</Code>, skills, hooks, and sessions. When Pi runs your turn, any
				skill or extension you enable is available to Claw, Simple, and Technical modes alike.
			</P>

			<Tip>
				Prefer the <strong className="text-[#cccccc]">Way of Work engine</strong> for chat (Mission tab
				→ Engine status) so tools and extensions actually execute — not prompt-only merges.
			</Tip>

			<H>Skills</H>
			<P>
				Skills are markdown playbooks under <Code>.pi/skills/&lt;name&gt;/SKILL.md</Code>{" "}
				(folder name must match frontmatter <Code>name</Code>). With workspace tools enabled,
				the <strong className="text-[#cccccc]">Claw agent</strong> can create or refine those
				files, attach skills in <Code>.pi/agents/*.md</Code> frontmatter, and log what changed
				in <Code>.claw/workspace/TOOLS.md</Code>. Skills compose with tools: the agent follows the skill
				while using the engine&apos;s built-ins and extension tools.
			</P>

			<H>Extensions & tools</H>
			<P>
				Extensions are TypeScript modules the engine loads from your workspace (e.g.{" "}
				<Code>extensions/&lt;name&gt;.ts</Code>), often with a one-line re-export under{" "}
				<Code>.pi/extensions/</Code> and an entry in <Code>.pi/settings.json</Code>{" "}
				<Code>extensions[]</Code>. They <strong className="text-[#cccccc]">register tools</strong>,{" "}
				slash commands, and hooks — the primary way to add custom capabilities beyond plain
				skills. The Claw agent is instructed to <strong className="text-[#cccccc]">write those files and settings</strong>{" "}
				(and run <Code>pi install …</Code> when appropriate), not only describe steps. After
				edits, run <Code>/reload</Code> in the TUI or restart the app so the engine picks up changes.
			</P>
			<P>
				Repo conventions and imports are documented in <Code>docs/EXTENSIONS.md</Code>,{" "}
				<Code>docs/TOOLS.md</Code>, and <Code>docs/SKILLS.md</Code> in this playground.
			</P>

			<H>Using what others built</H>
			<P>
				Any skill, extension, or agent-team pattern published for the{" "}
				<strong className="text-[#cccccc]">Way of Work agent</strong> can be dropped into your
				workspace the same way: copy or vendor the files, wire <Code>extensions[]</Code>, list
				skills in agent frontmatter, and keep licenses and trust in mind for third-party code.
				Claw is a <em>shell</em> — the ecosystem is agent-shaped, so community work &ldquo;for
				the agent&rdquo; is the right compatibility lens.
			</P>

			<H>Custom Claw UI (operator panels)</H>
			<P>
				For <strong className="text-[#cccccc]">Claw-only chrome</strong> — extra left-rail tabs
				and full-width views — call <Code>registerClawUiModule</Code> in{" "}
				<Code>apps/wayofwork-ui/src/claw/clawUserUiModules.ts</Code> (API in{" "}
				<Code>apps/wayofwork-ui/src/claw/clawUiModules.ts</Code>). Icons appear after{" "}
				<strong className="text-[#cccccc]">Files</strong>. The{" "}
				<strong className="text-[#cccccc]">Navigation</strong> section lists built-in tabs and
				the props passed to <Code>render</Code> (workspace root, theme, config, tab helpers).
			</P>

			<Note>
				UI modules are <strong>Way of Work client code</strong> — they do not replace Pi tools.
				Heavy logic still belongs in Pi extensions or workspace scripts so every mode benefits.
			</Note>
		</>
	);
}

function SectionHoncho() {
	return (
		<>
			<H>Honcho (cross-session memory API)</H>
			<P>
				<strong className="text-[#cccccc]">Honcho</strong> is an HTTP service for structured memory and
				context across sessions. It complements — but does not replace — Pi&apos;s in-thread memory and your{" "}
				<Code>.claw/workspace/MEMORY.md</Code> index: Claw still loads <Code>.claw/workspace/</Code> docs at session
				start; Honcho is
				where Hermes (and other clients) can persist and query a shared store.
			</P>

			<Tip>
				When chat runs through the <strong className="text-[#cccccc]">Pi engine</strong>, the playground&apos;s{" "}
				<Code>honcho-mirror</Code> extension can copy each finished turn into Honcho so Pi work shows up next to
				Hermes conversations. Pi keeps working if Honcho is offline; you get a one-time TUI warning.
			</Tip>

			<H>How this differs from Claw-only files</H>
			<div className="mb-4 rounded-xl border border-[#2a2a2a] overflow-hidden">
				<TableRow
					left={<Code>.claw/workspace/MEMORY.md</Code>}
					right="Small operator index loaded every session — edited by you or the agent in the workspace."
				/>
				<TableRow
					left="Honcho"
					right="Server-side API (sessions, messages, peers). Inspected via Swagger, Hermes tools, or cloud dashboard — not yet surfaced in Way of Work chrome."
				/>
			</div>

			<H>Operator checklist</H>
			<Step n={1}>
				Run Honcho API (see <Code>docs/HONCHO_INTEGRATION.md</Code>) and point <Code>HONCHO_BASE_URL</Code> at it.
			</Step>
			<Step n={2}>
				Keep <Code>honcho-mirror</Code> in <Code>.pi/settings.json</Code> <Code>extensions[]</Code> if you want Pi
				turns mirrored; set <Code>PI_HONCHO_MIRROR=0</Code> to disable without removing the extension.
			</Step>
			<Step n={3}>
				For natural-language search over Honcho, use <strong className="text-[#cccccc]">Hermes</strong> with the
				Honcho toolset (<Code>docs/HERMES_INTEGRATION.md</Code>).
			</Step>
			<Step n={4}>
				Align <Code>HONCHO_WORKSPACE</Code> with Hermes session settings when you want one logical workspace across
				clients.
			</Step>

			<Note>
				<strong>Product gap:</strong> Claw&apos;s Mission tab does not yet show Honcho health or browse API
				data — see <Code>docs/WOP_OPEN_TODOS.md</Code> (Honcho and Way of Work UI). Capability map:{" "}
				<Code>docs/HONCHO_CAPABILITIES.md</Code>.
			</Note>
		</>
	);
}

function SectionNgrok() {
	return (
		<>
			<H>Share Way of Work with ngrok</H>
			<P>
				<strong className="text-[#cccccc]">ngrok</strong> is a separate tool from{" "}
				<a href="https://ngrok.com/" target="_blank" rel="noopener noreferrer" className="text-sky-400 underline hover:text-sky-300">
					ngrok.com
				</a>
				. It gives you a <strong className="text-[#cccccc]">temporary https://… link</strong> on the internet that forwards to the machine
				where Bun + Vite run (often your home PC) — so you can use Claw from <strong className="text-[#cccccc]">work, travel, or another
				network</strong> while the real setup stays on that host.
			</P>

			<Tip>
				Use it when you want the <strong className="text-[#cccccc]">same session from another place</strong>, a colleague{" "}
				<strong className="text-[#cccccc]">demo link</strong>, or a cloud service to <strong className="text-[#cccccc]">hit your dev machine
				once</strong>. The link only works while Way of Work and ngrok are both running on that host.
			</Tip>

			<H>What you should know</H>
			<P>
				Anyone with the link can use your app while the tunnel is open — share it sparingly and stop ngrok when you
				are finished. Way of Work does <strong className="text-[#cccccc]">not</strong> install ngrok; use the menu{" "}
				<strong className="text-[#cccccc]">Settings → ngrok (public URL)…</strong> for copy-paste setup steps, or
				ask someone comfortable running a few terminal commands.
			</P>

			<Note tone="info">
				For the full Help Center (same ideas with a bit more context), open{" "}
				<strong className="text-[#cccccc]">Help → How to use</strong> from the top bar and choose{" "}
				<strong className="text-[#cccccc]">Share with ngrok</strong>.
			</Note>
		</>
	);
}

function SectionTabs() {
	const tabs = [
		{
			icon: Radar,
			name: "Mission",
			desc: "Your home dashboard. Shows connection status, Pi engine health, recent activity, agent roster, and whether your Claw Workspace files are set up. Quick action buttons let you start a chat, create a plan, open the team, run diagnostics, or jump to Schedules and Channels.",
		},
		{
			icon: MessageCircle,
			name: "Chat",
			desc: "Multi-session chat with Pi. Each session is a separate conversation thread. Use the session strip at the top to create new sessions, switch between them, or close old ones. The Workspace button opens a file panel next to the chat so you can read and edit the assistant profile files while you talk.",
		},
		{
			icon: Users,
			name: "Team",
			desc: "Displays all agent definitions loaded from .pi/agents/. Each agent has a name, role description, and optional configuration. You can open an agent's .md file directly from here to read or edit its system prompt.",
		},
		{
			icon: CalendarDays,
			name: "Schedule",
			desc: "Define timed Pi turns — cron or one-shot — saved on the Way of Work host under .claw/schedule/. When WOP_CLAW_SCHEDULER=1 and the same Pi engine as Chat is active, the Bun server runs them as headless Pi turns (shared agent-runtime, not a separate stack).",
		},
		{
			icon: Radio,
			name: "Channels",
			desc: "Connect Claw to external messaging services. Telegram shows a live filesystem snapshot (no secrets); webhooks and email are planned next.",
		},
		{
			icon: Files,
			name: "Files",
			desc: "Browse and preview all workspace files. Markdown files open in rendered Preview mode by default — use the Source toggle in the header to edit. Images, SVG, and Mermaid diagrams also show visual previews.",
		},
		{
			icon: Cog,
			name: "Settings",
			desc: "Appearance (dark / light), chat approval mode, and a link to switch to Technical mode for advanced workspace configuration.",
		},
	];

	return (
		<>
			<H>Navigation tabs</H>
			<P>The left rail is your main navigation. Each tab is its own view — switching tabs does not affect your chat sessions or open files.</P>
			<div className="flex flex-col gap-3">
				{tabs.map((t) => (
					<div
						key={t.name}
						className="flex items-start gap-3 rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] px-4 py-3"
					>
						<div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#ea580c]/15">
							<t.icon size={16} className="text-[#fb923c]" />
						</div>
						<div>
							<p className="text-[13px] font-bold text-[#cccccc]">{t.name}</p>
							<p className="mt-0.5 text-[12px] leading-relaxed text-[#858585]">{t.desc}</p>
						</div>
					</div>
				))}
			</div>
			<Tip>
				<strong className="text-[#cccccc]">Custom rail tabs:</strong> You can add more
				Claw nav entries and full-width panels by calling{" "}
				<Code>registerClawUiModule</Code> from{" "}
				<Code>apps/wayofwork-ui/src/claw/clawUiModules.ts</Code> inside{" "}
				<Code>apps/wayofwork-ui/src/claw/clawUserUiModules.ts</Code> (imported at app startup).
				Each module provides an id, label, optional Lucide icon, sort order, and a{" "}
				<Code>render</Code> callback that receives workspace root, dark/light flag,{" "}
				<Code>GET /api/config</Code> payload, and helpers to switch tabs or open a workspace
				file on the Files tab. For skills, extensions, and community-built agent add-ons, open
				the <strong className="text-[#cccccc]">Extending Claw</strong> section in this help
				sidebar.
			</Tip>
		</>
	);
}

function SectionWorkspace() {
	const files = [
		{ file: "SOUL.md", desc: "Who the assistant is: name, tone, and how it should sound when it talks to you." },
		{ file: "AGENTS.md", desc: "How each chat session starts: what to load first and how replies should be structured." },
		{ file: "USER.md", desc: "About you: time zone, how you like to work, preferences, and what you are focused on." },
		{ file: "MEMORY.md", desc: "A short list of facts the assistant should always remember. Keep it small (under about 2 KB) because it is read at the start of every session. Put longer notes in the memory folder instead." },
		{ file: "HEARTBEAT.md", desc: "A simple checklist of things to check or do regularly (for example weekly reviews)." },
		{ file: "TOOLS.md", desc: "Which integrations are turned on. If you use something like Telegram, this file points to where the real secret is stored (never commit the secret itself)." },
		{ file: "SECURITY.md", desc: "Rules for what files the assistant may touch and how to handle passwords and keys safely." },
		{ file: "memory/", desc: "Day-by-day notes. The assistant can add a dated summary here after a session so longer history does not clutter MEMORY.md." },
	];

	return (
		<>
			<H>Workspace</H>
			<P>
				The <strong className="text-[#cccccc]">Workspace</strong> is a small set of text files Claw uses to remember
				who the assistant is, how you like to work, and what it should do next. On disk they live under{" "}
				<Code>.claw/workspace/</Code> next to your <strong className="text-[#cccccc]">Way of Work installation</strong>{" "}
				(the folder where the app lives), <em>not</em> inside the project folder you opened to edit your own code.
				If you have not created them yet, use{" "}
				<strong className="text-[#cccccc]">Mission → Create Claw workspace folder</strong> (or the workspace setup
				in Settings). Optional Telegram settings can sit beside this folder as <Code>.claw/telegram.json</Code>.
			</P>

			<div className="mb-4 rounded-xl border border-[#2a2a2a] overflow-hidden">
				{files.map((f) => (
					<TableRow key={f.file} left={<Code>{f.file}</Code>} right={f.desc} />
				))}
			</div>

			<Note>
				If you store API keys or tokens under <Code>.claw/</Code>, make sure that folder (or those files) is listed in
				your project&apos;s <Code>.gitignore</Code> before you commit or share the repo, so private data is not
				uploaded by mistake.
			</Note>

			<H>Your project folder vs the Workspace</H>
			<P>
				<strong className="text-[#cccccc]">The folder you open</strong> (File → Open Folder) is your everyday work:
				source code, docs, and anything you see in the file tree. <strong className="text-[#cccccc]">The Workspace</strong>{" "}
				is separate: it is the assistant&apos;s profile and memory, bundled with Way of Work. The assistant can still read
				and change files in your opened project when you ask it to.
			</P>
			<div className="mb-4 rounded-xl border border-[#2a2a2a] overflow-hidden">
				<TableRow left="Daily memory notes" right="Inside Workspace → memory (one dated file per day)" />
				<TableRow left="Your code and project files" right="In the folder you opened — shown in Explorer" />
				<TableRow left="Plans" right="Shared plan documents, available in every UI mode" />
				<TableRow left="Saved chat sessions" right="Kept by the Pi assistant runtime for continuity" />
			</div>
		</>
	);
}

function SectionSchedules() {
	return (
		<>
			<H>Schedules</H>
			<P>
				In the <strong className="text-[#cccccc]">Schedule tab</strong> you can define
				Pi turns that should run automatically on a timer. Each schedule has a name, a
				cron frequency, an optional agent, and a prompt instruction.
			</P>

			<Note tone="success">
				<strong className="text-[#cccccc]">Phase D (core) is shipped:</strong> definitions and last-run
				state live in <Code>.claw/schedule/</Code> on the host checkout (synced via the API). With{" "}
				<Code>WOP_CLAW_SCHEDULER=1</Code> and the same headless Pi path as the Chat tab (Mission → Engine
				shows Pi driving chat: <Code>WOP_CHAT_ENGINE</Code> auto/unset or <Code>pi</Code>,{" "}
				<Code>pi</Code> CLI resolved, not bundled/bun), the server timer runs enabled schedules as one{" "}
				<Code>pi --mode json</Code> turn per fire — identical runtime to a manual chat message. The browser may still mirror drafts in localStorage until the server responds.
			</Note>

			<P>
				<strong className="text-[#fb923c]">Still on the roadmap:</strong> richer per-schedule audit UI,
				global pause / kill-switch, and rate-limit caps. See <Code>docs/WOP_CLAW_MODE_PLAN.md</Code>.
			</P>

			<H>Creating a schedule</H>
			<Step n={1}>Click <strong className="text-[#cccccc]">New schedule</strong> in the Schedule tab header.</Step>
			<Step n={2}>Give it a clear name (e.g. &ldquo;Daily standup digest&rdquo;).</Step>
			<Step n={3}>Choose a frequency from the preset list, or select <em>Custom…</em> and enter a cron expression (e.g. <Code>0 9 * * 1-5</Code>).</Step>
			<Step n={4}>Optionally specify an agent name to use a specific persona from <Code>.pi/agents/</Code>.</Step>
			<Step n={5}>Write the task instruction that Pi will receive at each run.</Step>
			<Step n={6}>Toggle it <strong>Enabled</strong> and click <strong className="text-[#cccccc]">Add schedule</strong>.</Step>

			<H>Cron expression cheatsheet</H>
			<div className="mb-4 rounded-xl border border-[#2a2a2a] overflow-hidden">
				<TableRow left={<Code>0 * * * *</Code>} right="Every hour" />
				<TableRow left={<Code>*/30 * * * *</Code>} right="Every 30 minutes" />
				<TableRow left={<Code>0 9 * * 1-5</Code>} right="Weekdays at 9 AM" />
				<TableRow left={<Code>0 9 * * *</Code>} right="Daily at 9 AM" />
				<TableRow left={<Code>0 20 * * *</Code>} right="Daily at 8 PM" />
				<TableRow left={<Code>0 9 * * 1</Code>} right="Every Monday at 9 AM" />
			</div>
		</>
	);
}

function SectionChannels({
	connected,
	streaming,
	onGoToTelegramChannels,
	onDismissHelp,
	onFocusClawChatTab,
}: {
	connected: boolean;
	streaming: boolean;
	onGoToTelegramChannels?: () => void;
	onDismissHelp: () => void;
	/** Ensures Claw Chat is mounted so the composer inject listener is active. */
	onFocusClawChatTab?: () => void;
}) {
	return (
		<>
			<div className="mb-5 flex flex-col gap-2 rounded-xl border border-sky-500/25 bg-[#0c4a6e]/20 px-4 py-3">
				<div className="flex items-center gap-2">
					<Radio size={16} className="shrink-0 text-sky-300" aria-hidden />
					<p className="text-[13px] font-semibold leading-snug text-sky-100">Telegram (via Pi)</p>
				</div>
				<p className="text-[12px] leading-relaxed text-[#94a3b8]">
					The live bridge runs in a real Pi session with the <Code>pi-telegram</Code> extension (
					<Code>/telegram-setup</Code>, <Code>/telegram-connect</Code>). Use the buttons below to
					insert a setup checklist into the chat composer or open the Channels tab.
				</p>
				<div className="flex flex-wrap gap-2">
					<button
						type="button"
						disabled={!connected || streaming}
						onClick={() => {
							onFocusClawChatTab?.();
							injectIntoChatComposer(clawTelegramSetupChecklist());
						}}
						className="rounded-lg border border-sky-500/40 bg-sky-950/40 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-sky-100 transition-colors hover:bg-sky-900/50 disabled:cursor-not-allowed disabled:opacity-40"
					>
						Insert setup checklist
					</button>
					{onGoToTelegramChannels ? (
						<button
							type="button"
							disabled={!connected}
							onClick={() => {
								onGoToTelegramChannels();
								onDismissHelp();
							}}
							className="rounded-lg border border-[#3c3c3c] bg-[#252526] px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-[#cccccc] transition-colors hover:border-sky-500/40 disabled:cursor-not-allowed disabled:opacity-40"
						>
							Open Channels tab
						</button>
					) : null}
				</div>
			</div>

			<H>Channels</H>
			<P>
				Channels let Claw send and receive messages through external services. The{" "}
				<strong className="text-[#cccccc]">Channels tab</strong> shows all available
				integrations and their setup status.
			</P>

			<Note>
				The <strong className="text-[#cccccc]">Channels</strong> tab shows a read-only Telegram snapshot (token
				file presence and <Code>pi-telegram</Code> in <Code>extensions[]</Code>) — never the secret itself. Live
				polling runs in Pi after <Code>/telegram-connect</Code>. Webhook URL generation and email are still
				planned.
			</Note>

			<H>Setting up Telegram</H>
			<P>
				Telegram is the priority integration. It uses the{" "}
				<Code>pi-telegram</Code> Pi extension so messages are handled by Pi&apos;s full
				tool runtime — not a separate bot.
			</P>
			<Step n={1}>
				Open Telegram and message <Code>@BotFather</Code> → send <Code>/newbot</Code> →
				follow the prompts → copy the bot token.
			</Step>
			<Step n={2}>
				In Pi, run <Code>/telegram-setup</Code> and paste the token (writes{" "}
				<Code>~/.pi/agent/telegram.json</Code> or a workspace gitignored path).{" "}
				<strong className="text-[#f14c4c]">Never commit the raw token</strong>. Optionally note in{" "}
				<Code>.claw/workspace/TOOLS.md</Code> that Telegram is enabled.
			</Step>
			<Step n={3}>
				Add <Code>pi-telegram</Code> to the <Code>extensions[]</Code> array in{" "}
				<Code>.pi/settings.json</Code>.
			</Step>
			<Step n={4}>
				Run <Code>/reload</Code> in Pi TUI or restart Way of Work.
			</Step>
			<Step n={5}>
				Run <Code>/telegram-connect</Code> then <Code>/telegram-status</Code>. In Telegram, open your bot DM and
				send <Code>/start</Code> to pair.
			</Step>
			<Step n={6}>
				Send a message to your bot — Pi will respond using its full tool set.
			</Step>

			<Tip>
				See <Code>docs/WOP_TELEGRAM_PLAN.md</Code> in the repo for the full integration
				roadmap and security notes.
			</Tip>

			<H>Phase E — what&apos;s next for channels</H>
			<P>
				<strong className="text-[#fb923c]">Next for Phase E:</strong> inbound webhook routing (Pi turn on HTTP
				event), outbound notification wiring, and per-channel audit log. Telegram live bridge details:{" "}
				<Code>docs/WOP_TELEGRAM_PLAN.md</Code> (T-3/T-4). Claw-wide phases: <Code>docs/WOP_CLAW_MODE_PLAN.md</Code>{" "}
				(Phase E).
			</P>
		</>
	);
}

function SectionFiles() {
	return (
		<>
			<H>Files & Preview</H>
			<P>
				The <strong className="text-[#cccccc]">Files tab</strong> lets you browse and
				preview all workspace files. The chat-side file panel (open via the{" "}
				<strong className="text-[#cccccc]">Workspace</strong> button in the Chat tab) works the same way.
			</P>

			<H>Preview modes</H>
			<div className="mb-4 rounded-xl border border-[#2a2a2a] overflow-hidden">
				<TableRow left="Markdown (.md)" right="Opens in rendered Preview by default. Toggle Source in the header to edit raw text. Claw defaults to Preview on every file open." />
				<TableRow left="Images (.png, .jpg…)" right="Shown as a scaled image. Toggle Source to see the base64 bytes." />
				<TableRow left="SVG (.svg)" right="Rendered as a vector image. Toggle Source for the XML." />
				<TableRow left="Mermaid (.mmd)" right="Rendered as a live diagram." />
				<TableRow left="Code / text" right="Shown in the syntax-highlighted editor immediately." />
				<TableRow left="Binary" right="Shown as a type notice — open externally to edit." />
			</div>

			<H>Editing files</H>
			<P>
				Click <strong>Source</strong> in the header to switch to the raw editor.
				Make your changes and press <Code>Ctrl+Enter</Code> (or the{" "}
				<strong>Keep file</strong> button) to save. Press <strong>Undo changes</strong> to
				revert to the last saved snapshot.
			</P>

			<Tip>
				The agent can read and write any workspace file when asked — even from the Chat
				tab. You do not need to open a file manually before asking the agent to edit it.
			</Tip>

			<H>Opening Workspace files quickly</H>
			<P>
				From the <strong>Mission tab</strong>, click any file name in the Claw Workspace
				card to open it directly in the Files tab. In <strong>Chat</strong>, the Workspace side panel lists the same
				files next to the conversation.
			</P>
		</>
	);
}

function SectionTips() {
	const tips = [
		{
			icon: MessageCircle,
			title: "Multiple chat sessions",
			body: "Create separate sessions for different tasks using the + button in the Chat tab session strip. Each session keeps its own conversation history.",
		},
		{
			icon: Bot,
			title: "Agent context in chat",
			body: "At the start of each session, Pi reads your Workspace files SOUL.md, AGENTS.md, and MEMORY.md so the assistant knows its personality and what to remember. Keep MEMORY.md short (under about 2 KB).",
		},
		{
			icon: FolderOpen,
			title: "Create the Workspace in one step",
			body: "Go to Mission tab → Claw Workspace card → Set up workspace. Seven starter files are created with sensible defaults you can edit.",
		},
		{
			icon: CalendarDays,
			title: "Schedules on the server",
			body: "Define automations in the Schedule tab — they persist under .claw/schedule/ on the host checkout. Set WOP_CLAW_SCHEDULER=1 and fix Mission → Engine so Pi drives chat (same runtime as sending a message); then the timer runs them automatically.",
		},
		{
			icon: Zap,
			title: "Switching modes",
			body: "Click the mode toggle in the top-left of the menu bar to switch between Simple, Technical, and Claw. Each shell keeps its own chat sessions and history; workspace files on disk are unchanged.",
		},
		{
			icon: Cpu,
			title: "Pi engine check",
			body: "Mission → Claw status: Engine reflects the shared chat runtime. Schedules and inbound webhooks call the same headless Pi turn as Chat (not a fork) — when Mission shows Bun-only or Pi idle, automations that need Pi will skip until that row is green for Pi.",
		},
	];

	return (
		<>
			<H>Quick tips</H>
			<div className="flex flex-col gap-3">
				{tips.map((t) => (
					<div
						key={t.title}
						className="flex items-start gap-3 rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] px-4 py-3"
					>
						<div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#4ec9b0]/15">
							<t.icon size={14} className="text-[#4ec9b0]" />
						</div>
						<div>
							<p className="text-[13px] font-semibold text-[#cccccc]">{t.title}</p>
							<p className="mt-0.5 text-[12px] leading-relaxed text-[#858585]">{t.body}</p>
						</div>
					</div>
				))}
			</div>
		</>
	);
}

// ──────────────────────────────────────────────
// Section registry
// ──────────────────────────────────────────────

export type ClawHelpSectionId =
	| "overview"
	| "tabs"
	| "workspace"
	| "schedules"
	| "channels"
	| "files"
	| "extend"
	| "honcho"
	| "ngrok"
	| "tips";

type SectionId = ClawHelpSectionId;

const SECTIONS: { id: SectionId; label: string; icon: typeof Radar }[] = [
	{ id: "overview", label: "Overview", icon: Cpu },
	{ id: "tabs", label: "Navigation", icon: Radar },
	{ id: "workspace", label: "Workspace", icon: FolderOpen },
	{ id: "schedules", label: "Schedules", icon: CalendarDays },
	{ id: "channels", label: "Channels", icon: Radio },
	{ id: "files", label: "Files & Preview", icon: Files },
	{ id: "extend", label: "Extending Claw", icon: Puzzle },
	{ id: "honcho", label: "Honcho & memory", icon: Database },
	{ id: "ngrok", label: "Share with ngrok", icon: Globe },
	{ id: "tips", label: "Tips", icon: Zap },
];

function renderSection(
	id: SectionId,
	channelsHelp: {
		connected: boolean;
		streaming: boolean;
		onGoToTelegramChannels?: () => void;
		onDismissHelp: () => void;
		onFocusClawChatTab?: () => void;
	},
) {
	switch (id) {
		case "overview": return <SectionOverview />;
		case "tabs": return <SectionTabs />;
		case "workspace": return <SectionWorkspace />;
		case "schedules": return <SectionSchedules />;
		case "channels":
			return (
				<SectionChannels
					connected={channelsHelp.connected}
					streaming={channelsHelp.streaming}
					onGoToTelegramChannels={channelsHelp.onGoToTelegramChannels}
					onDismissHelp={channelsHelp.onDismissHelp}
					onFocusClawChatTab={channelsHelp.onFocusClawChatTab}
				/>
			);
		case "files": return <SectionFiles />;
		case "extend": return <SectionExtendingClaw />;
		case "honcho": return <SectionHoncho />;
		case "ngrok": return <SectionNgrok />;
		case "tips": return <SectionTips />;
	}
}

// ──────────────────────────────────────────────
// Modal
// ──────────────────────────────────────────────

export function ClawHelpModal({
	open,
	onDismiss,
	/** When the modal opens, show this section first (e.g. **channels**). */
	defaultSection,
	connected = false,
	streaming = false,
	onGoToTelegramChannels,
	onFocusClawChatTab,
	layout = "desktop",
}: {
	open: boolean;
	onDismiss: () => void;
	defaultSection?: ClawHelpSectionId | null;
	/** From Claw session — disables composer inject while disconnected or streaming. */
	connected?: boolean;
	streaming?: boolean;
	/** Jump to Claw Channels tab (closes help). */
	onGoToTelegramChannels?: () => void;
	/** Switch to Claw Chat before composer inject (Help can open from any tab). */
	onFocusClawChatTab?: () => void;
	/** `mobile` = full viewport, horizontal section chips (`?shell=mobile`). */
	layout?: "desktop" | "mobile";
}) {
	const [activeSection, setActiveSection] = useState<SectionId>("overview");

	useEffect(() => {
		if (!open) return;
		setActiveSection(defaultSection ?? "overview");
	}, [open, defaultSection]);

	if (!open) return null;

	const channelsHelp = {
		connected,
		streaming,
		onGoToTelegramChannels,
		onDismissHelp: onDismiss,
		onFocusClawChatTab,
	};

	const isMobileLayout = layout === "mobile";
	const shellClass = isMobileLayout
		? "relative flex h-[100dvh] max-h-[100dvh] w-full max-w-full flex-col overflow-hidden rounded-none border-0 bg-[#161616] shadow-none"
		: "relative flex h-[88vh] w-[min(900px,95vw)] flex-col overflow-hidden rounded-2xl border border-[#2a2a2a] bg-[#161616] shadow-2xl";

	const modal = (
		<div
			className={`fixed inset-0 z-[9000] flex items-center justify-center bg-black/70 backdrop-blur-sm ${isMobileLayout ? "p-0" : "p-3"}`}
			onClick={(e) => e.target === e.currentTarget && onDismiss()}
		>
			<div className={shellClass} onClick={(e) => e.stopPropagation()}>
				{/* ── Header ── */}
				<div
					className="flex shrink-0 items-center justify-between border-b border-[#2a2a2a] px-4 py-3 sm:px-6 sm:py-4"
					style={{ paddingTop: isMobileLayout ? "max(0.75rem, env(safe-area-inset-top))" : undefined }}
				>
					<div className="flex items-center gap-3">
						<div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#ea580c]/30 bg-[#ea580c]/10">
							<Cpu size={18} className="text-[#fb923c]" />
						</div>
						<div>
							<h2 className="text-[15px] font-bold text-[#e5e5e5]">Claw — Help & Guide</h2>
							<p className="text-[11px] text-[#585858]">
								Mission-control shell for autonomous Pi agent operations
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onDismiss}
						className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-[#585858] transition-colors hover:bg-[#2a2a2a] hover:text-[#cccccc]"
						aria-label="Close help"
					>
						<X size={18} />
					</button>
				</div>

				{/* ── Body ── */}
				{isMobileLayout ? (
					<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
						<nav className="flex shrink-0 gap-1.5 overflow-x-auto border-b border-[#2a2a2a] px-2 py-2">
							{SECTIONS.map((s) => {
								const isActive = activeSection === s.id;
								return (
									<button
										key={s.id}
										type="button"
										onClick={() => setActiveSection(s.id)}
										className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-left text-[11px] font-semibold transition-colors ${
											isActive
												? "border-[#ea580c]/40 bg-[#ea580c]/18 text-[#fb923c]"
												: "border-[#2a2a2a] bg-[#1e1e1e] text-[#858585] hover:text-[#cccccc]"
										}`}
									>
										<s.icon size={13} className="shrink-0" />
										{s.label}
									</button>
								);
							})}
						</nav>
						<div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
							{renderSection(activeSection, channelsHelp)}
						</div>
					</div>
				) : (
					<div className="flex min-h-0 flex-1 overflow-hidden">
						<nav className="flex w-[175px] shrink-0 flex-col gap-1 overflow-y-auto border-r border-[#2a2a2a] p-3">
							{SECTIONS.map((s) => {
								const isActive = activeSection === s.id;
								return (
									<button
										key={s.id}
										type="button"
										onClick={() => setActiveSection(s.id)}
										className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[12px] font-medium transition-colors ${
											isActive
												? "bg-[#ea580c]/18 text-[#fb923c]"
												: "text-[#585858] hover:bg-[#1e1e1e] hover:text-[#aaaaaa]"
										}`}
									>
										<s.icon size={14} className="shrink-0" />
										{s.label}
									</button>
								);
							})}
						</nav>
						<div className="min-h-0 flex-1 overflow-y-auto p-6">
							{renderSection(activeSection, channelsHelp)}
						</div>
					</div>
				)}

				{/* ── Footer ── */}
				<div
					className="flex shrink-0 flex-col gap-2 border-t border-[#2a2a2a] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6"
					style={{ paddingBottom: isMobileLayout ? "max(0.75rem, env(safe-area-inset-bottom))" : undefined }}
				>
					<p className="min-w-0 text-[11px] text-[#3c3c3c]">
						Full roadmap:{" "}
						<span className="font-mono text-[10px] text-[#585858]">docs/WOP_CLAW_MODE_PLAN.md</span>
						{" · "}
						<span className="font-mono text-[10px] text-[#585858]">docs/WOP_CLAW_UI_PLAN.md</span>
					</p>
					<button
						type="button"
						onClick={onDismiss}
						className="min-h-11 w-full rounded-lg px-4 py-2 text-[12px] font-semibold text-[#585858] transition-colors hover:bg-[#1e1e1e] hover:text-[#cccccc] sm:min-h-0 sm:w-auto"
					>
						Close
					</button>
				</div>
			</div>
		</div>
	);

	return createPortal(modal, document.body);
}
