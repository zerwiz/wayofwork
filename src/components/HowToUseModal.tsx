import {
	BookOpen,
	Bot,
	Brain,
	Code2,
	Database,
	Globe,
	FolderOpen,
	LayoutDashboard,
	Rocket,
	Settings2,
	Users,
	X,
	Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// ─── tiny shared prose helpers ───────────────────────────────────────────────

function H({ children }: { children: React.ReactNode }) {
	return <h3 className="mb-2 mt-5 text-[14px] font-bold text-white first:mt-0">{children}</h3>;
}

function P({ children }: { children: React.ReactNode }) {
	return <p className="mb-3 text-[13px] leading-relaxed text-[#cccccc]">{children}</p>;
}

function UL({ children }: { children: React.ReactNode }) {
	return (
		<ul className="mb-3 list-outside list-disc space-y-1.5 pl-5 text-[13px] leading-relaxed text-[#cccccc]">
			{children}
		</ul>
	);
}

function Chip({ children }: { children: React.ReactNode }) {
	return (
		<span className="rounded border border-[#3c3c3c] bg-[#1e1e1e] px-1.5 py-0.5 font-mono text-[11px] text-[#d4d4d4]">
			{children}
		</span>
	);
}

function DevBox({ children }: { children: React.ReactNode }) {
	return (
		<div className="mb-4 rounded-xl border border-[#ea580c]/25 bg-[#ea580c]/8 px-4 py-3 text-[12px] leading-relaxed text-[#d4d4d4]">
			<span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-[#fb923c]">
				For developers
			</span>
			{children}
		</div>
	);
}

function InfoBox({ children }: { children: React.ReactNode }) {
	return (
		<div className="mb-4 rounded-xl border border-[#007acc]/30 bg-[#007acc]/10 px-4 py-3 text-[12px] leading-relaxed text-[#d4d4d4]">
			{children}
		</div>
	);
}

function Row({
	label,
	value,
}: {
	label: React.ReactNode;
	value: React.ReactNode;
}) {
	return (
		<div className="flex gap-3 border-b border-[#3c3c3c] py-2 text-[12px] last:border-0">
			<span className="w-36 shrink-0 font-semibold text-[#cccccc]">{label}</span>
			<span className="text-[#858585]">{value}</span>
		</div>
	);
}

// ─── sections ────────────────────────────────────────────────────────────────

function SectionWelcome() {
	return (
		<>
			<P>
				<strong className="text-white">Way of Pi</strong> is a desktop app that wraps an AI coding assistant
				in a friendly interface — a file browser, chat window, code editor, and controls, all in one place.
			</P>
			<InfoBox>
				<strong className="text-white">The simplest explanation:</strong> Imagine a super-smart robot called{" "}
				<strong>Pi</strong> that is amazing at writing code. Normally you type at it in a plain black terminal.
				Way of Pi gives that robot a proper <em>control center</em> — windows, buttons, and a file browser —
				so it's much easier to work with.
			</InfoBox>

			<H>Two parts (like a game console)</H>
			<div className="mb-4 overflow-hidden rounded-xl border border-[#3c3c3c]">
				<Row
					label="🧠 Pi (the engine)"
					value="The AI brain that reads code, writes files, runs commands, and follows your instructions."
				/>
				<Row
					label="🖥️ Way of Pi (the shell)"
					value="The app you see: file tree, chat, editor, agent roster, and model picker."
				/>
			</div>

			<H>What you can do</H>
			<UL>
				<li>
					<strong className="text-white">Chat with AI</strong> — ask questions, ask it to write or fix code,
					or have it explore your project and explain what it finds.
				</li>
				<li>
					<strong className="text-white">Browse & edit files</strong> — open any file in your workspace,
					read it, edit it, and save — all without leaving the app.
				</li>
				<li>
					<strong className="text-white">Use specialist agents</strong> — switch to a Planner, Builder,
					Reviewer, or any other persona with one click.
				</li>
				<li>
					<strong className="text-white">Build a team of AI bots</strong> — set up multiple agents with
					different roles and let them work together on a task.
				</li>
				<li>
					<strong className="text-white">Choose your AI model</strong> — use a local model on your own
					computer (Ollama) or a cloud model (OpenRouter) depending on your needs.
				</li>
			</UL>

			<DevBox>
				Way of Pi runs a <Chip>Bun</Chip> server (<Chip>apps/wayofwork-ui/server/</Chip>) and a Vite+React
				frontend. Chat uses <Chip>WOP_CHAT_ENGINE</Chip> to route turns: when unset or <Chip>auto</Chip>, the
				server uses headless <Chip>pi --mode json</Chip> when the Pi CLI resolves, otherwise direct
				Ollama/OpenRouter; <Chip>pi</Chip> requires Pi; <Chip>bundled</Chip>/<Chip>bun</Chip> forces Bun-only. See{" "}
				<Chip>docs/WOP_PI_BACKEND_WIRING_PLAN.md</Chip> for the wiring map.
			</DevBox>
		</>
	);
}

function SectionGettingStarted() {
	return (
		<>
			<P>
				Follow these five steps and you'll be chatting with AI about your project in under two minutes.
			</P>

			<div className="mb-6 flex flex-col gap-3">
				{[
					{
						n: "1",
						title: "Open a folder",
						body: (
							<>
								Go to <strong className="text-white">File → Open Folder</strong> (or the{" "}
								<strong className="text-white">Projects &amp; Workspace</strong> tab in Simple mode) and
								pick the folder of your project. Everything — the file tree, chat, and AI actions —
								will work inside that folder. You can change it any time.
							</>
						),
					},
					{
						n: "2",
						title: "Pick a layout",
						body: (
							<>
								Use the buttons at the top to switch between{" "}
								<strong className="text-white">Simple</strong> (chat-first, great for beginners),{" "}
								<strong className="text-white">Technical</strong> (IDE-style with multi-pane grid), or{" "}
								<strong className="text-white">Claw</strong> (same as Technical with a roadmap banner).
								Start with <strong className="text-white">Simple</strong> if you're not sure.
							</>
						),
					},
					{
						n: "3",
						title: "Choose a model",
						body: (
							<>
								Go to <strong className="text-white">AI Brains</strong> (Simple) or the model menu in the
								status bar (Technical). Pick the AI model you want to use. If you have Ollama running
								locally, your local models will appear here. If you have an OpenRouter API key, cloud
								models appear too.
							</>
						),
					},
					{
						n: "4",
						title: "Pick an agent (optional)",
						body: (
							<>
								In the chat panel, you can pick a <strong className="text-white">persona</strong> from
								the agent dropdown. "Default" means a general assistant. Others like{" "}
								<strong className="text-white">Planner</strong>,{" "}
								<strong className="text-white">Builder</strong>, or{" "}
								<strong className="text-white">Reviewer</strong> give the AI a focused role.
							</>
						),
					},
					{
						n: "5",
						title: "Start chatting",
						body: (
							<>
								Type your question or request in the chat box at the bottom and press{" "}
								<strong className="text-white">Send</strong>. That's it! Ask it to explain your code,
								write a new feature, or help you fix a bug.
							</>
						),
					},
				].map((s) => (
					<div
						key={s.n}
						className="flex gap-3 rounded-xl border border-[#3c3c3c] bg-[#1e1e1e] px-4 py-3"
					>
						<div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#ea580c] text-[12px] font-extrabold text-white">
							{s.n}
						</div>
						<div>
							<p className="mb-1 text-[13px] font-bold text-white">{s.title}</p>
							<p className="text-[12px] leading-relaxed text-[#cccccc]">{s.body}</p>
						</div>
					</div>
				))}
			</div>

			<DevBox>
				Start the server with <Chip>./start-wayofpi-electron.sh</Chip> (Electron, recommended) or{" "}
				<Chip>./start-wayofwork-ui.sh</Chip> (browser). The Bun server binds to port{" "}
				<Chip>WOP_SERVER_PORT</Chip> (default 3333). Set <Chip>WOP_WORKSPACE</Chip> in a root-level{" "}
				<Chip>.env</Chip> to pre-load a workspace without clicking. Use <Chip>just wayofpi-electron</Chip>{" "}
				from the repo root for the canonical dev command.
			</DevBox>
		</>
	);
}

/** Shown first in Help → Agents — the usual coding roster. */
const PRIMARY_BUILTIN_AGENTS: [string, string][] = [
	["🔭 Scout", "Explores and maps your codebase. Great first step for any task."],
	["📋 Planner", "Breaks down your request into a structured step-by-step plan."],
	["🔨 Builder", "Writes and edits code to implement features or fix bugs."],
	["🔍 Reviewer", "Reads code and points out problems, risks, and improvements."],
	["📝 Documenter", "Updates README files and docs to match the current code."],
	["🌐 Web Searcher", "Searches the web and fetches pages for research tasks."],
];

/** Additional personas shipped in this playground’s `.pi/agents/` (expand in the modal). */
const MORE_BUILTIN_AGENTS: [string, string][] = [
	["📄 Code Documenter", "Docstrings, comments, and code-facing markdown — never changes program behavior."],
	["🗂️ Indexer", "Walks a folder and writes INDEX.md so others can orient without re-scanning the tree."],
	["🎫 Ralph", "File-queue worker: one .txt ticket at a time with HTML output; pairs with planner/builder in teams."],
	["🎮 Bowser", "Headless browser automation via Playwright (UI tests, screenshots, scraping)."],
	["📡 Hermes", "Bridge to the external Hermes CLI — send a prompt, relay stdout back to the user."],
	["🔎 Project Scanner", "Bootstraps ~/.pi/projects/<slug>/ docs from the template for a new workspace."],
	["🚪 Playground Portal", "Ports extensions, skills, and shims from the Pi playground into your app repo."],
	["🦾 Claw", "Way of Pi Claw shell lead — operator flows, .claw/ workspace, Telegram setup guidance."],
	["🛡️ Red Team", "Adversarial review: vulnerabilities, edge cases, severity — read-only, no file edits."],
	["✅ Plan Reviewer", "Critiques plans/PLAN-*.md: assumptions, risks, ordering, and missing steps."],
	["🧠 Pi orchestrator (Pi Pi)", "Meta-agent that coordinates Pi-internal experts (extensions, themes, skills, …)."],
	[
		"🧩 Pi product experts",
		"Focused personas for extending Pi itself: extensions, themes, skills, config, TUI, prompts, agents, CLI, keybindings.",
	],
];

function SectionAgents() {
	const [moreAgentsOpen, setMoreAgentsOpen] = useState(false);

	return (
		<>
			<P>
				An <strong className="text-white">agent</strong> is an AI helper with a specific job and
				personality. Way of Pi ships with agents for the most common coding roles.
			</P>

			<InfoBox>
				<strong className="text-white">Think of it like hiring a specialist:</strong> instead of one
				general assistant, you have a <em>Planner</em> who lays out the strategy, a <em>Builder</em> who
				writes the code, a <em>Reviewer</em> who checks quality, and a <em>Scout</em> who explores the
				codebase first. You can talk to each one individually, or let them work as a team.
			</InfoBox>

			<H>Built-in agents</H>
			<div className="overflow-hidden rounded-xl border border-[#3c3c3c] text-[12px]">
				{PRIMARY_BUILTIN_AGENTS.map(([name, desc]) => (
					<Row key={String(name)} label={name} value={desc} />
				))}
			</div>
			<button
				type="button"
				onClick={() => setMoreAgentsOpen((o) => !o)}
				className="mb-4 mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-[#3c3c3c] bg-[#252526] px-3 py-2 text-[12px] font-semibold text-[#cccccc] transition-colors hover:border-[#ea580c]/50 hover:bg-[#2d2d2d] hover:text-white"
				aria-expanded={moreAgentsOpen}
			>
				<span className="text-[#ea580c]">{moreAgentsOpen ? "▲" : "▼"}</span>
				{moreAgentsOpen ? "Hide additional built-in agents" : "Show more built-in agents"}
			</button>
			{moreAgentsOpen ? (
				<>
					<div className="mb-3 overflow-hidden rounded-xl border border-[#3c3c3c] text-[12px]">
						{MORE_BUILTIN_AGENTS.map(([name, desc]) => (
							<Row key={String(name)} label={name} value={desc} />
						))}
					</div>
					<P>
						On top of these, this repo ships{" "}
						<strong className="text-white">well over a hundred domain specialists</strong> under{" "}
						<Chip>.pi/agents/domain-specialists/</Chip> (language stacks, infra, security, data/AI,
						research, and more). Open <strong className="text-white">My AI Team</strong> and hit{" "}
						<strong className="text-white">Refresh</strong> to see every agent your workspace scan loads.
					</P>
				</>
			) : null}

			<H>How to switch agents</H>
			<UL>
				<li>
					In <strong className="text-white">Simple mode</strong>: use the agent dropdown in the chat
					panel, or go to <strong className="text-white">My AI Team</strong> in the side nav.
				</li>
				<li>
					In <strong className="text-white">Technical mode</strong>: the agent selector appears in the
					chat panel header.
				</li>
				<li>
					Changing agent changes the AI's <em>personality and focus</em> for that conversation — it does
					not restart or lose your chat history.
				</li>
			</UL>

			<DevBox>
				Agents are <Chip>.md</Chip> files with YAML frontmatter (<Chip>name</Chip>,{" "}
				<Chip>description</Chip>, <Chip>tools</Chip>) and a body that becomes the system prompt.
				Scan order: <Chip>agents/</Chip> → <Chip>.claude/agents/</Chip> → <Chip>.pi/agents/</Chip> →{" "}
				<Chip>.cursor/agents/</Chip> (first <Chip>name</Chip> wins). Create or edit agent files in your
				workspace and hit <strong className="text-white">Refresh</strong> in My AI Team. Tools in the
				frontmatter are only enforced when turns route through Pi (<Chip>WOP_CHAT_ENGINE=pi</Chip>);
				otherwise they document intent only.
			</DevBox>
		</>
	);
}

function SectionTeams() {
	return (
		<>
			<P>
				A <strong className="text-white">team</strong> is a named group of agents. Instead of picking
				agents one by one, you define a team once and re-use it for any task that needs those roles.
			</P>

			<InfoBox>
				<strong className="text-white">Think of it like assembling your squad before a game.</strong> The
				"full" team might have a Scout, Planner, Builder, Reviewer, and Documenter. A "frontend" team
				might only have a Planner, Builder, and a React specialist. You choose the squad; the AI decides
				who does what.
			</InfoBox>

			<H>How to manage teams</H>
			<UL>
				<li>
					Go to <strong className="text-white">My AI Team</strong> in the Simple side nav.
				</li>
				<li>
					Click <strong className="text-white">New team</strong> to create a team and give it a name.
				</li>
				<li>
					Click <strong className="text-white">Edit Teams</strong> to open the visual editor — add or
					remove agents with checkboxes, no YAML required.
				</li>
				<li>
					Click <strong className="text-white">Edit roster</strong> on any existing team card to change
					its members.
				</li>
				<li>
					Press <strong className="text-white">Save changes</strong> when you're done — nothing is saved
					until you click that button.
				</li>
			</UL>

			<H>Pre-built teams</H>
			<div className="mb-4 overflow-hidden rounded-xl border border-[#3c3c3c] text-[12px]">
				{[
					["full", "Scout + Planner + Builder + Reviewer + Documenter — all-rounder"],
					["plan-build", "Planner + Builder + Reviewer + Code Documenter — focused coding"],
					["frontend", "Planner + Builder + Bowser (browser automation)"],
					["info", "All research/info agents — scout, web-searcher, indexer, documenter"],
					["ralph", "Ralph (ticket queue) + Builder + Planner + Reviewer — ticket-driven work"],
				].map(([name, desc]) => (
					<Row key={name} label={<Chip>{name}</Chip>} value={desc} />
				))}
			</div>

			<DevBox>
				Teams are stored in <Chip>.pi/agents/teams.yaml</Chip> (workspace-relative). Format: each key is
				a team name, value is a YAML list of agent <Chip>name</Chip> fields. The{" "}
				<Chip>GET /api/agents</Chip> endpoint returns both agents and teams. Mutations via the GUI write
				the file with <Chip>PUT /api/file</Chip>. The orchestrator's{" "}
				<Chip>team_member_add / remove</Chip> tools in <Chip>server/teams-yaml-mutate.ts</Chip> offer the
				same via chat commands.
			</DevBox>
		</>
	);
}

function SectionModels() {
	return (
		<>
			<P>
				<strong className="text-white">AI Brains</strong> is where you choose which AI model powers
				your chat. Think of it like picking an engine — a bigger model gives smarter answers but may be
				slower; a smaller local model replies instantly but knows less.
			</P>

			<H>Two ways to run AI</H>
			<div className="mb-4 overflow-hidden rounded-xl border border-[#3c3c3c]">
				<Row
					label="🏠 Ollama (local)"
					value="Runs on your own computer. Private, free, works offline. Install Ollama, pull a model (e.g. llama3), and it appears automatically."
				/>
				<Row
					label="☁️ OpenRouter (cloud)"
					value="Access models like Claude, GPT-4, Gemini, and many more via the internet. Requires an API key from openrouter.ai. Costs vary per model."
				/>
			</div>

			<H>Session model vs provider</H>
			<UL>
				<li>
					<strong className="text-white">Session model</strong> — the model you pick for this browser
					session right now. Quick to change; saved in your browser.
				</li>
				<li>
					<strong className="text-white">Provider files</strong> — the JSON files on disk that configure
					which models are available. Advanced; usually you only touch these once when setting up.
				</li>
			</UL>

			<H>Quick setup guide</H>
			<UL>
				<li>
					<strong className="text-white">Using Ollama:</strong> install from ollama.com, run{" "}
					<Chip>ollama pull llama3</Chip> (or any model), start Ollama, then open AI Brains — your model
					will appear in the list.
				</li>
				<li>
					<strong className="text-white">Using OpenRouter:</strong> create a free account at
					openrouter.ai, get an API key, add <Chip>OPENROUTER_API_KEY=sk-...</Chip> to your{" "}
					<Chip>.env</Chip> file, and restart the server.
				</li>
			</UL>

			<DevBox>
				Provider is set by <Chip>WOP_LLM_PROVIDER</Chip> (<Chip>ollama</Chip> or{" "}
				<Chip>openrouter</Chip>). Ollama host defaults to <Chip>OLLAMA_HOST</Chip> (default{" "}
				<Chip>http://localhost:11434</Chip>). Default model: <Chip>OLLAMA_MODEL</Chip> or{" "}
				<Chip>OPENROUTER_MODEL</Chip>. The session model override is sent over WebSocket as{" "}
				<Chip>set_model</Chip> and stored in <Chip>localStorage</Chip> as{" "}
				<Chip>wayofpi.activeLlmModel</Chip>. Restart the Bun server after changing env. Full var list:{" "}
				<Chip>apps/wayofwork-ui/.env.sample</Chip>.
			</DevBox>
		</>
	);
}

function SectionLayout() {
	return (
		<>
			<P>
				Way of Pi has three layout modes selectable from the top bar. Each is optimised for a different
				style of working.
			</P>

			<div className="mb-6 flex flex-col gap-3">
				{[
					{
						icon: "💬",
						name: "Simple",
						badge: "Recommended for beginners",
						desc: "Chat-first layout with a side nav for My AI Team, AI Brains, files, and settings. Everything is one click away. Great for people who mainly want to chat with AI about their project.",
						tips: [
							"Side nav on the left: Chat, Files, My AI Team, AI Brains, Projects, Settings.",
							"File panel opens files side-by-side with chat.",
							"AI Brains lets you pick your model without touching any config files.",
						],
					},
					{
						icon: "⚙️",
						name: "Technical",
						badge: "For developers",
						desc: "IDE-style layout with a multi-pane grid (up to 3×4 cells), file tree, terminal, dockable panels, and full workspace control. Designed for people who work like they're in VS Code or Zed.",
						tips: [
							"Drag and drop panel tabs between cells.",
							"Resize panels by dragging the split handles.",
							"Command Palette: Ctrl+Shift+P (Cmd+Shift+P on Mac).",
							"Status bar at the bottom shows model, context, and tokens.",
						],
					},
					{
						icon: "🦾",
						name: "Claw",
						badge: "Experimental",
						desc: "Mission-control shell for autonomous Pi agent operations. Has its own navigation rail with Mission, Chat, Team, Schedule, Channels, Files, and Settings tabs. Distinct from Technical — designed for running persistent, scheduled, and multi-agent tasks rather than IDE-style editing.",
						tips: [
							"Mission tab: agent status dashboard, workspace health, and quick actions.",
							"Chat tab: multi-session conversations with session strip for switching threads.",
							"Schedule tab: cron or one-shot Pi turns — saved on host .claw/schedule/; set WOP_CLAW_SCHEDULER=1 and Pi-backed chat to run them automatically.",
							"Channels tab: Telegram bot integration setup and future webhook/email channels.",
							"Files tab: browse and preview workspace files — Markdown opens in Preview by default.",
							"The .claw/ folder stores agent identity, memory, and tool config (isolated from Simple/Technical).",
						],
					},
				].map((m) => (
					<div key={m.name} className="rounded-xl border border-[#3c3c3c] bg-[#1e1e1e] p-4">
						<div className="mb-2 flex items-center gap-2">
							<span className="text-lg">{m.icon}</span>
							<span className="font-bold text-white">{m.name}</span>
							<span className="rounded-full border border-[#ea580c]/40 bg-[#ea580c]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#fb923c]">
								{m.badge}
							</span>
						</div>
						<p className="mb-2 text-[12px] leading-relaxed text-[#cccccc]">{m.desc}</p>
						<ul className="space-y-1 text-[11px] text-[#858585]">
							{m.tips.map((t) => (
								<li key={t} className="flex gap-1.5">
									<span className="shrink-0 text-[#ea580c]">›</span>
									{t}
								</li>
							))}
						</ul>
					</div>
				))}
			</div>

			<DevBox>
				Layout mode is stored in <Chip>localStorage</Chip> as <Chip>wayofpi.uiMode</Chip>. The
				Technical/Claw grid state is persisted under <Chip>wayofpi.technical.workspaceGrid.v1</Chip>.
				Dock weights (row/col split sizes) are part of the same JSON. Panel tabs follow{" "}
				<Chip>PanelDockLayout</Chip> v3 (<Chip>{"{ tabs, activeIndex }"}</Chip>). Switching modes does not
				reset workspace or chat.
			</DevBox>
		</>
	);
}

function SectionWorkspace() {
	return (
		<>
			<P>
				A <strong className="text-white">workspace</strong> is the folder on your computer that Way of Pi
				works inside. Everything — the file tree, chat context, and AI actions — is scoped to that
				folder. You choose it; the app can't see anything outside it.
			</P>

			<InfoBox>
				<strong className="text-white">Analogy:</strong> Think of the workspace like opening a drawer.
				The AI can only see and touch things inside that drawer. To work on a different project, you
				"open a different drawer" (switch workspace). Nothing from the old drawer mixes in.
			</InfoBox>

			<H>How to open or change the workspace</H>
			<UL>
				<li>
					<strong className="text-white">Simple mode:</strong> go to the{" "}
					<strong className="text-white">Projects &amp; Workspace</strong> tab in the side nav. Click{" "}
					<strong className="text-white">Choose folder…</strong> and type the path, or click a recently
					used folder to switch instantly.
				</li>
				<li>
					<strong className="text-white">Any mode:</strong> use{" "}
					<strong className="text-white">File → Open Folder</strong> from the menu bar.
				</li>
				<li>
					<strong className="text-white">At startup:</strong> set <Chip>WOP_WORKSPACE=/path/to/project</Chip>{" "}
					in your <Chip>.env</Chip> file (next to <Chip>apps/</Chip>) and restart the server.
				</li>
			</UL>

			<H>Important rules</H>
			<UL>
				<li>
					The workspace is set by the <strong className="text-white">server</strong>, not by which file
					tab you have open. Opening a file doesn't change the workspace.
				</li>
				<li>
					All <Chip>/api/file</Chip> calls, the file tree, and the AI's working directory refer to the
					workspace root — not to wherever the Way of Pi app lives.
				</li>
				<li>
					If the workspace shows a "Way of Pi" path when you mean to work on your own project, use{" "}
					<strong className="text-white">Open Folder</strong> to switch.
				</li>
			</UL>

			<DevBox>
				Workspace roots come from <Chip>WOP_WORKSPACE</Chip> env or the{" "}
				<Chip>POST /api/workspace</Chip> op (<Chip>open_folder</Chip>, <Chip>add_folder</Chip>,{" "}
				<Chip>remove_folder</Chip>). Multiple roots are supported (multi-root workspace); the first root
				is the primary for <Chip>teams.yaml</Chip>, Pi <Chip>cwd</Chip>, and relative path resolution.
				Recent folders are stored in <Chip>localStorage</Chip> as{" "}
				<Chip>wayofpi.workspace.recentFolders</Chip>. Server path jail: all <Chip>/api/file</Chip>{" "}
				and <Chip>/api/tree</Chip> calls are resolved relative to the workspace roots — arbitrary absolute
				paths outside the workspace are rejected.
			</DevBox>
		</>
	);
}

function SectionForDevelopers() {
	return (
		<>
			<P>
				This section is for people who want to go deeper: configure the Pi engine, write extensions,
				set up providers, or contribute to Way of Pi itself.
			</P>

			<H>Connecting Pi (the real AI engine)</H>
			<P>
				By default, chat routes directly to Ollama or OpenRouter (fast, no extra setup). To unlock Pi's
				full power — real tools, extensions, <Chip>dispatch_agent</Chip>, slash commands — set:
			</P>
			<div className="mb-4 overflow-hidden rounded-xl border border-[#3c3c3c] bg-[#1a1a1a]">
				<Row label={<Chip>WOP_CHAT_ENGINE</Chip>} value={<><Chip>pi</Chip> — require Pi CLI · <Chip>auto</Chip> or <em>unset</em> — Pi JSON when <Chip>pi</Chip> resolves, else provider · <Chip>bundled</Chip>/<Chip>bun</Chip> — Bun-only</>} />
				<Row label={<Chip>WOP_PI_BINARY</Chip>} value="Absolute path to the pi CLI; leading ~/ is expanded. If unset, the server uses PATH (Bun.which)." />
				<Row label={<Chip>WOP_HOME</Chip>} value="Isolates Pi's ~/.pi equivalent — useful for multi-project setups" />
				<Row label={<Chip>WOP_WORKSPACE</Chip>} value="Pre-set the workspace folder at server boot" />
				<Row label={<Chip>WOP_LLM_PROVIDER</Chip>} value={<><Chip>ollama</Chip> or <Chip>openrouter</Chip></>} />
				<Row label={<Chip>WOP_ALLOW_TERMINAL</Chip>} value={<><Chip>1</Chip> to enable the embedded terminal (opt-in, use with care)</>} />
			</div>
			<P>
				Put these in a <Chip>.env</Chip> file at the repository root (next to <Chip>apps/</Chip>) and
				restart the server. Full list: <Chip>apps/wayofwork-ui/.env.sample</Chip>.
			</P>

			<H>Extensions</H>
			<P>
				Extensions are TypeScript files that teach Pi new tools, slash commands, TUI widgets, or hooks.
				They live in <Chip>extensions/</Chip> with a re-export shim in <Chip>.pi/extensions/</Chip> and
				are listed in <Chip>.pi/settings.json</Chip>.
			</P>
			<UL>
				<li>Run a single extension: <Chip>pi -e extensions/my-ext.ts</Chip></li>
				<li>Reload after editing: type <Chip>/reload</Chip> in a running Pi session</li>
				<li>Register a tool: call <Chip>registerTool(name, schema, handler)</Chip> at extension top level</li>
				<li>Add a slash command: <Chip>registerCommand("/mycommand", …)</Chip></li>
			</UL>

			<H>Agents & skills (disk format)</H>
			<UL>
				<li>
					<strong className="text-white">Agent:</strong> <Chip>.md</Chip> file with YAML frontmatter{" "}
					(<Chip>name</Chip>, <Chip>description</Chip>, <Chip>tools</Chip>) + body = system prompt.
					Drop into <Chip>.pi/agents/</Chip>.
				</li>
				<li>
					<strong className="text-white">Skill:</strong> folder <Chip>.pi/skills/&lt;name&gt;/SKILL.md</Chip>{" "}
					with a frontmatter <Chip>name</Chip> matching the folder. Invoked with{" "}
					<Chip>/skill:name</Chip> in Pi.
				</li>
				<li>
					<strong className="text-white">Teams:</strong> <Chip>.pi/agents/teams.yaml</Chip> — a YAML
					map of team name → list of agent <Chip>name</Chip> values.
				</li>
			</UL>

			<H>Key server endpoints</H>
			<div className="mb-4 overflow-hidden rounded-xl border border-[#3c3c3c] text-[12px]">
				<Row label={<Chip>GET /api/agents</Chip>} value="Workspace agents + teams catalog (Pi scan order)" />
				<Row label={<Chip>GET /api/file?path=…</Chip>} value="Read a workspace file (jailed to workspace roots)" />
				<Row label={<Chip>PUT /api/file</Chip>} value="Write a workspace file" />
				<Row label={<Chip>GET /api/tree</Chip>} value="Workspace file tree" />
				<Row label={<Chip>GET /api/diagnostics</Chip>} value="Health, env, Ollama probe, Pi version" />
				<Row label={<Chip>WS /ws</Chip>} value="Chat WebSocket: send_message, set_model, set_agent, streaming tokens" />
			</div>

			<H>Useful commands</H>
			<UL>
				<li><Chip>just wayofpi-electron</Chip> — start Electron shell (recommended)</li>
				<li><Chip>just wayofwork-ui</Chip> — start browser dev server</li>
				<li><Chip>just pi</Chip> — launch Pi TUI in the playground</li>
				<li><Chip>just wop-upstream-check</Chip> — check for upstream Pi updates</li>
				<li><Chip>Ctrl+Shift+P</Chip> — command palette (any mode)</li>
			</UL>

			<DevBox>
				Way of Pi docs live in <Chip>docs/WOP_*.md</Chip>. Key reads:{" "}
				<Chip>WOP_PI_BACKEND_WIRING_PLAN.md</Chip> (API wiring phases),{" "}
				<Chip>WOP_TECHNICAL_UI.md</Chip> (shell architecture),{" "}
				<Chip>WOP_NAMESPACE.md</Chip> (isolation rules),{" "}
				<Chip>WOP_OPEN_TODOS.md</Chip> (gaps and backlog). Pi playground docs:{" "}
				<Chip>EXTENSIONS.md</Chip>, <Chip>AGENTS.md</Chip>, <Chip>SKILLS.md</Chip>,{" "}
				<Chip>AGENT_TEAMS.md</Chip>.
			</DevBox>
		</>
	);
}

function SectionHoncho() {
	return (
		<>
			<P>
				<strong className="text-white">Honcho</strong> is a separate <em>memory and context</em> service
				with an HTTP API. It stores structured, cross-session data so tools like{" "}
				<strong className="text-white">Hermes</strong> can search and summarize what happened across many
				chats — different from Pi&apos;s in-session JSONL and slash-command memory.
			</P>

			<InfoBox>
				<strong className="text-white">Mental model:</strong> Pi still &ldquo;remembers&rdquo; the current
				thread the usual way (<Chip>AGENT_MEMORY.md</Chip>, session files). Honcho is an optional{" "}
				<strong>archive and retrieval layer</strong> other clients can query. If Honcho is down, Pi keeps
				working normally.
			</InfoBox>

			<H>Pi → Honcho mirror (this playground)</H>
			<P>
				The <Chip>honcho-mirror</Chip> extension (<Chip>extensions/honcho-mirror.ts</Chip>, listed in{" "}
				<Chip>.pi/settings.json</Chip>) posts each <strong>completed</strong> user or assistant turn to
				Honcho&apos;s messages API so your local stack can correlate Pi work with Hermes sessions. It does{" "}
				<strong className="text-white">not</strong> replace Pi prompts — it only copies finished text
				(metadata includes <Chip>source: &quot;pi&quot;</Chip>, cwd, model id).
			</P>

			<H>What you need running</H>
			<UL>
				<li>
					A reachable Honcho API (typical local URL <Chip>http://127.0.0.1:18000</Chip>) — often via Docker
					from your <Chip>honcho-server</Chip> checkout; see <Chip>docs/HONCHO_INTEGRATION.md</Chip>.
				</li>
				<li>
					<strong className="text-white">Hermes</strong> with the Honcho toolset if you want natural-language{" "}
					<Chip>honcho_search</Chip>, <Chip>honcho_context</Chip>, etc. — see{" "}
					<Chip>docs/HERMES_INTEGRATION.md</Chip>.
				</li>
				<li>
					Align <Chip>HONCHO_WORKSPACE</Chip> (and Honcho SDK <Chip>~/.honcho/config.json</Chip>) with Hermes{" "}
					<Chip>honcho.session_id</Chip> when you want one logical store across clients.
				</li>
			</UL>

			<H>Turn mirroring off or tune it</H>
			<div className="mb-4 overflow-hidden rounded-xl border border-[#3c3c3c] text-[12px]">
				<Row
					label={<Chip>PI_HONCHO_MIRROR</Chip>}
					value={<>Set <Chip>0</Chip> / <Chip>false</Chip> / <Chip>off</Chip> to disable mirroring (default: on).</>}
				/>
				<Row label={<Chip>HONCHO_MIRROR_DISABLED</Chip>} value={<><Chip>1</Chip> — alternate opt-out.</>} />
				<Row label={<Chip>HONCHO_BASE_URL</Chip>} value="Honcho API root (must match your running stack)." />
				<Row label={<Chip>HONCHO_JWT</Chip>} value="Bearer token when Honcho auth is enabled." />
			</div>
			<P>
				Remove <Chip>honcho-mirror</Chip> from <Chip>extensions[]</Chip> if you do not want the extension loaded
				at all. After env changes, <Chip>/reload</Chip> in Pi or restart the app.
			</P>

			<H>Way of Pi UI (today)</H>
			<P>
				Simple, Technical, and Claw modes do <strong className="text-white">not</strong> yet show Honcho
				connection health or browse Honcho data in-app. Use Honcho&apos;s <Chip>/docs</Chip> (Swagger), Hermes
				tools, or the capability map in <Chip>docs/HONCHO_CAPABILITIES.md</Chip>. Shell integration is tracked
				in <Chip>docs/WOP_OPEN_TODOS.md</Chip> (Honcho and Way of Pi UI).
			</P>

			<DevBox>
				Full stack notes: <Chip>docs/HONCHO_INTEGRATION.md</Chip>, <Chip>docs/HONCHO_LOCAL_AI.md</Chip>,{" "}
				<Chip>docs/Hermes_Honcho_connection.md</Chip>. Official product docs:{" "}
				<a
					href="https://docs.honcho.dev"
					target="_blank"
					rel="noopener noreferrer"
					className="text-[#4fc3f7] underline hover:text-[#81d4fa]"
				>
					docs.honcho.dev
				</a>
				.
			</DevBox>
		</>
	);
}

function SectionNgrok() {
	return (
		<>
			<P>
				<strong className="text-white">ngrok</strong> is a small helper program (from{" "}
				<a
					href="https://ngrok.com/"
					target="_blank"
					rel="noopener noreferrer"
					className="text-[#4fc3f7] underline hover:text-[#81d4fa]"
				>
					ngrok.com
				</a>
				) that creates a <strong className="text-white">temporary public web link</strong> pointing at Way of Pi
				while it runs on your computer. Think of it like forwarding a mobile number to your landline: people use
				the new number; the call still lands on your machine.
			</P>

			<P>
				<strong className="text-white">Optional for Way of Pi.</strong> You never have to install or run ngrok unless you want that public link.
				Local editing, chat, and the rest of the shell work the same without it.
			</P>

			<InfoBox>
				<strong className="text-white">Why would I care?</strong> Normally you only open Way of Pi on the machine
				where Bun + Vite run (for example your home PC). With ngrok, you can open that <strong className="text-white">same</strong> setup
				from <strong className="text-white">work, a café, or another network</strong> — the stack stays on the host; your browser uses the
				public link. Same idea for a teammate demo or a cloud webhook test — <em>only while Way of Pi and ngrok both run on the host</em>.
			</InfoBox>

			<H>Everyday uses</H>
			<UL>
				<li>
					<strong className="text-white">Reach home (or your dev box) from elsewhere</strong> — leave Way of Pi + ngrok running on that
					machine; at work or on travel, paste the ngrok <code className="text-[#ce9178]">https://…</code> link in your browser.
				</li>
				<li>
					<strong className="text-white">Show someone your screen without screen-sharing software</strong> — you
					send them a link; they see the app in their browser. Good for quick demos or “does this look right?”
				</li>
				<li>
					<strong className="text-white">Use your phone or tablet</strong> — open the ngrok link on another
					device while the real project and AI stay on your computer.
				</li>
				<li>
					<strong className="text-white">Testing hooks from the internet</strong> — some cloud tools need to
					“phone home” to your app once. ngrok gives them a reachable address for that experiment.
				</li>
			</UL>

			<H>What to watch out for</H>
			<UL>
				<li>
					Anyone who has the link can try to use your app while the tunnel is up — treat it like a{" "}
					<strong className="text-white">guest key</strong>, not a public billboard. Close the tunnel when you are
					done.
				</li>
				<li>
					In <strong className="text-white">dev</strong>, <strong className="text-white">Settings → ngrok (public URL)…</strong> can{" "}
					<strong className="text-white">install the ngrok agent into this app</strong> (one button: runs <code className="text-[#ce9178]">bun install</code> or{" "}
					<code className="text-[#ce9178]">npm install</code> in <code className="text-[#ce9178]">apps/wayofwork-ui</code>), save your dashboard{" "}
					<strong className="text-white">authtoken</strong> on the host, and start/stop a managed <code className="text-[#ce9178]">ngrok http</code> for the usual Vite port. Production builds do not expose those APIs.
				</li>
			</UL>

			<DevBox>
				Concrete commands and ports (Vite vs Bun only) live in that Settings dialog. Official help from the vendor:{" "}
				<a
					href="https://ngrok.com/docs"
					target="_blank"
					rel="noopener noreferrer"
					className="text-[#4fc3f7] underline hover:text-[#81d4fa]"
				>
					ngrok.com/docs
				</a>
				.
			</DevBox>
		</>
	);
}

function SectionCapabilities() {
	return (
		<>
			<P>
				A quick map of what works today, what's partially implemented, and what's planned.
			</P>

			<H>Core shell — fully working</H>
			<div className="mb-4 overflow-hidden rounded-xl border border-[#3c3c3c] text-[12px]">
				{[
					["Simple / Technical / Claw UI", "Three layout modes, all switchable from the top bar"],
					["File tree & editor", "Browse, read, edit, and save workspace files; markdown preview; binary read"],
					["Chat with Ollama / OpenRouter", "Direct-to-provider chat; streaming; queue; agent persona merge"],
					["Workspace agents catalog", "Scans .pi/agents/, agents/, .claude/agents/ — same order as Pi"],
					["Teams editor GUI", "Create, edit, delete teams and members without touching YAML"],
					["AI Brains model picker", "Select session model; configure provider files"],
					["Projects & Workspace", "Switch workspace, recent folders, refresh tree"],
					["Diagnostics / Host Doctor", "Health check, env, Ollama probe, Pi binary detection"],
					["Electron desktop app", "Recommended for full file picker and shell integration"],
				].map(([feat, note]) => (
					<Row
						key={feat}
						label={
							<span className="flex items-center gap-1.5">
								<span className="text-green-400">✓</span> {feat}
							</span>
						}
						value={note}
					/>
				))}
			</div>

			<H>Partially implemented</H>
			<div className="mb-4 overflow-hidden rounded-xl border border-[#3c3c3c] text-[12px]">
				{[
					["Pi as chat engine", "WOP_CHAT_ENGINE=pi routes turns through pi --mode json for real tools/extensions; long-lived Pi + WS tunnel is roadmap"],
					["Agent persona in chat", "Merges agent .md body into system prompt — not real dispatch_agent subprocess yet"],
					["Embedded terminal", "Opt-in via WOP_ALLOW_TERMINAL=1; policy with Pi approvals ongoing"],
					["Manifest (extensions list)", "Lists extension paths; tool/slash introspection needs runtime Pi"],
				].map(([feat, note]) => (
					<Row
						key={feat}
						label={
							<span className="flex items-center gap-1.5">
								<span className="text-yellow-400">~</span> {feat}
							</span>
						}
						value={note}
					/>
				))}
			</div>

			<H>Planned / roadmap</H>
			<div className="mb-4 overflow-hidden rounded-xl border border-[#3c3c3c] text-[12px]">
				{[
					["Multi-agent real dispatch", "Per-agent streams, real dispatch_agent from UI, WebSocket per agent"],
					["Autonomous Claw flows", "Scheduled, tool-using, approval-gated agent runs"],
					["Persistent Pi sidecar", "Long-lived Pi process behind WS — full extensions + tools every turn"],
					[
						"Honcho in the shell",
						"Health, HONCHO_* transparency, optional read-only helpers — Pi/Hermes remain the interactive Honcho tool paths",
					],
				].map(([feat, note]) => (
					<Row
						key={feat}
						label={
							<span className="flex items-center gap-1.5">
								<span className="text-[#858585]">◦</span> {feat}
							</span>
						}
						value={note}
					/>
				))}
			</div>

			<InfoBox>
				Full capability details with doc links: <Chip>docs/WOP_PRODUCT_CAPABILITIES.md</Chip>. Living
				backlog: <Chip>docs/WOP_OPEN_TODOS.md</Chip>. Roadmap hub:{" "}
				<Chip>docs/WOP_PLANNING.md</Chip>.
			</InfoBox>
		</>
	);
}

// ─── nav config ──────────────────────────────────────────────────────────────

const SECTIONS = [
	{ id: "welcome", label: "Welcome", icon: Rocket, component: SectionWelcome },
	{ id: "start", label: "Getting Started", icon: Zap, component: SectionGettingStarted },
	{ id: "agents", label: "Agents", icon: Bot, component: SectionAgents },
	{ id: "teams", label: "Teams", icon: Users, component: SectionTeams },
	{ id: "models", label: "AI Brains & Models", icon: Brain, component: SectionModels },
	{ id: "layout", label: "Layout Modes", icon: LayoutDashboard, component: SectionLayout },
	{ id: "workspace", label: "Workspace", icon: FolderOpen, component: SectionWorkspace },
	{ id: "devs", label: "For Developers", icon: Code2, component: SectionForDevelopers },
	{ id: "honcho", label: "Honcho & memory", icon: Database, component: SectionHoncho },
	{ id: "ngrok", label: "Share with ngrok", icon: Globe, component: SectionNgrok },
	{ id: "capabilities", label: "Capabilities", icon: Settings2, component: SectionCapabilities },
] as const;

export type HowToUseSectionId = (typeof SECTIONS)[number]["id"];

type SectionId = HowToUseSectionId;

// ─── main modal ──────────────────────────────────────────────────────────────

/** Help → How to use — comprehensive multi-section help center for all skill levels. */
export function HowToUseModal({
	open,
	onDismiss,
	/** When set as the modal opens, selects this sidebar section (e.g. from Settings → ngrok). Cleared by parent on dismiss. */
	initialSectionId = null,
}: {
	open: boolean;
	onDismiss: () => void;
	/** kept for API compat but not used — content is now all inline */
	repoBlobBase?: string;
	initialSectionId?: HowToUseSectionId | null;
}) {
	const [activeId, setActiveId] = useState<SectionId>("welcome");

	useEffect(() => {
		if (!open) return;
		if (initialSectionId != null) setActiveId(initialSectionId);
		else setActiveId("welcome");
	}, [open, initialSectionId]);

	if (!open) return null;
	const portalTarget = typeof document !== "undefined" ? document.body : null;
	if (!portalTarget) return null;

	const active = SECTIONS.find((s) => s.id === activeId) ?? SECTIONS[0];
	const Content = active.component;

	return createPortal(
		<div
			className="fixed inset-0 z-[20000] flex items-center justify-center bg-black/65 p-4"
			role="presentation"
			onMouseDown={(e) => {
				if (e.target === e.currentTarget) onDismiss();
			}}
		>
			<div
				className="flex h-[min(92vh,740px)] w-full max-w-4xl overflow-hidden rounded-2xl border border-[#454545] bg-[#1e1e1e] shadow-2xl"
				role="dialog"
				aria-labelledby="how-to-use-title"
				aria-modal="true"
				onMouseDown={(e) => e.stopPropagation()}
			>
				{/* Sidebar nav */}
				<div className="flex w-52 shrink-0 flex-col border-r border-[#3c3c3c] bg-[#252526]">
					<div className="border-b border-[#3c3c3c] px-4 py-4">
						<div className="flex items-center gap-2">
							<BookOpen size={16} className="shrink-0 text-[#ea580c]" />
							<span className="text-[13px] font-bold text-white">Help Center</span>
						</div>
						<p className="mt-1 text-[11px] text-[#858585]">Way of Pi guide</p>
					</div>
					<nav className="flex-1 overflow-y-auto py-2">
						{SECTIONS.map((s) => {
							const Icon = s.icon;
							const on = s.id === activeId;
							return (
								<button
									key={s.id}
									type="button"
									onClick={() => setActiveId(s.id)}
									className={`flex w-full items-center gap-2.5 px-4 py-2 text-left text-[12px] transition-colors ${
										on
											? "bg-[#ea580c]/15 font-semibold text-[#fb923c]"
											: "text-[#cccccc] hover:bg-[#3c3c3c]"
									}`}
								>
									<Icon size={14} className="shrink-0" />
									{s.label}
								</button>
							);
						})}
					</nav>
					<div className="border-t border-[#3c3c3c] p-3">
						<p className="text-[10px] leading-relaxed text-[#6b6b6b]">
							Docs also in <span className="font-mono">docs/</span> in the repo.
						</p>
					</div>
				</div>

				{/* Content area */}
				<div className="flex min-w-0 flex-1 flex-col">
					<div className="flex shrink-0 items-center justify-between border-b border-[#3c3c3c] px-5 py-4">
						<div className="flex items-center gap-2">
							{(() => {
								const Icon = active.icon;
								return <Icon size={16} className="shrink-0 text-[#ea580c]" />;
							})()}
							<h2 id="how-to-use-title" className="text-[15px] font-bold text-white">
								{active.label}
							</h2>
						</div>
						<button
							type="button"
							onClick={onDismiss}
							className="rounded-lg p-1.5 text-[#858585] hover:bg-[#3c3c3c] hover:text-[#cccccc]"
							aria-label="Close"
						>
							<X size={20} />
						</button>
					</div>

					<div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
						<Content />
					</div>

					<div className="flex shrink-0 items-center justify-between border-t border-[#3c3c3c] px-5 py-3">
						<div className="flex gap-1">
							{SECTIONS.map((s) => (
								<button
									key={s.id}
									type="button"
									onClick={() => setActiveId(s.id)}
									title={s.label}
									className={`h-1.5 w-5 rounded-full transition-colors ${
										s.id === activeId ? "bg-[#ea580c]" : "bg-[#3c3c3c] hover:bg-[#555]"
									}`}
									aria-label={s.label}
								/>
							))}
						</div>
						<div className="flex gap-2">
							{activeId !== SECTIONS[0].id && (
								<button
									type="button"
									onClick={() => {
										const idx = SECTIONS.findIndex((s) => s.id === activeId);
										if (idx > 0) setActiveId(SECTIONS[idx - 1].id);
									}}
									className="rounded-lg border border-[#3c3c3c] px-3 py-1.5 text-[12px] font-semibold text-[#cccccc] hover:bg-[#3c3c3c]"
								>
									← Back
								</button>
							)}
							{activeId !== SECTIONS[SECTIONS.length - 1].id ? (
								<button
									type="button"
									onClick={() => {
										const idx = SECTIONS.findIndex((s) => s.id === activeId);
										if (idx < SECTIONS.length - 1) setActiveId(SECTIONS[idx + 1].id);
									}}
									className="rounded-lg bg-[#ea580c] px-4 py-1.5 text-[12px] font-bold text-white hover:bg-[#c2410c]"
								>
									Next →
								</button>
							) : (
								<button
									type="button"
									onClick={onDismiss}
									className="rounded-lg bg-[#007acc] px-4 py-1.5 text-[12px] font-bold text-white hover:bg-[#006bb3]"
								>
									Got it — close
								</button>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>,
		portalTarget,
	);
}
