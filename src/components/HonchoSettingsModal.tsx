import { Brain, ExternalLink, X } from "lucide-react";

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

export function HonchoSettingsModal({
	open,
	onClose,
	appearanceDark,
	integrationDocUrl,
}: {
	open: boolean;
	onClose: () => void;
	appearanceDark: boolean;
	/** Canonical repo guide (opens in new tab). */
	integrationDocUrl: string;
}) {
	const overlay = appearanceDark ? "bg-black/55" : "bg-black/35";
	const panel = appearanceDark ? "border-[#454545] bg-[#252526] text-[#cccccc]" : "border-[#e5e5e5] bg-white text-[#333]";
	const sub = appearanceDark ? "text-[#858585]" : "text-[#616161]";
	const card = appearanceDark ? "border-[#3c3c3c] bg-[#1e1e1e]" : "border-[#e5e5e5] bg-[#fafafa]";
	const borderB = appearanceDark ? "border-[#3c3c3c]" : "border-[#e5e5e5]";

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
				className={`max-h-[90vh] w-full max-w-lg overflow-hidden rounded-xl border shadow-2xl ${panel}`}
				role="dialog"
				aria-modal
				aria-labelledby="wop-honcho-settings-title"
				onMouseDown={(e) => e.stopPropagation()}
			>
				<div className={`flex items-center justify-between border-b px-5 py-3 ${borderB}`}>
					<div className="flex items-center gap-2">
						<Brain className="text-[#a78bfa]" size={22} aria-hidden />
						<h2 id="wop-honcho-settings-title" className="text-lg font-bold">
							Honcho (memory API)
						</h2>
					</div>
					<button type="button" onClick={onClose} className="rounded p-1 hover:bg-black/10 dark:hover:bg-[#3c3c3c]" aria-label="Close">
						<X size={20} />
					</button>
				</div>

				<div className="max-h-[calc(90vh-52px)] overflow-y-auto px-5 py-4 text-[13px] leading-relaxed">
					<div className={`mb-4 rounded-lg border p-4 ${card}`}>
						<h3 className="mb-2 font-semibold">In simple terms</h3>
						<p className={`text-[12px] ${sub}`}>
							Think of Honcho as a <strong className={appearanceDark ? "text-[#e0e0e0]" : "text-[#111]"}>shared binder</strong> on a
							computer: different apps can add pages and read what is already there over the web (HTTP). Pi still has its own
							chat notebook; Honcho is an <em>extra</em> copy so tools like Hermes can use the same project memory across
							sessions. <strong className={appearanceDark ? "text-[#e0e0e0]" : "text-[#111]"}>Workspace</strong> = which binder,{" "}
							<strong className={appearanceDark ? "text-[#e0e0e0]" : "text-[#111]"}>peers</strong> = you vs the assistant,{" "}
							<strong className={appearanceDark ? "text-[#e0e0e0]" : "text-[#111]"}>sessions</strong> = which conversation thread.
						</p>
					</div>

					<p className={`mb-4 ${sub}`}>
						<strong className={appearanceDark ? "text-[#e0e0e0]" : "text-[#111]"}>Honcho</strong> stores cross-session context over
						HTTP (workspaces, peers, sessions). Clients like{" "}
						<strong className={appearanceDark ? "text-[#e0e0e0]" : "text-[#111]"}>Hermes</strong> read and write that API; Pi can{" "}
						<em>mirror</em> chat turns into Honcho so everything shares one workspace.
					</p>

					<div className={`mb-4 rounded-lg border p-4 ${card}`}>
						<h3 className="mb-2 font-semibold">Pi mirror (playground)</h3>
						<p className={`mb-2 text-[12px] ${sub}`}>
							The <Mono dark={appearanceDark}>honcho-mirror</Mono> extension posts finished user/assistant
							turns to Honcho when the API is up. Pi keeps working if Honcho is down (you may see one mirror
							warning).
						</p>
						<ul className={`list-disc space-y-1 pl-5 text-[12px] ${sub}`}>
							<li>
								Workspace env: <Mono dark={appearanceDark}>HONCHO_WORKSPACE</Mono>,{" "}
								<Mono dark={appearanceDark}>HONCHO_USER_PEER</Mono>, <Mono dark={appearanceDark}>HONCHO_AI_PEER</Mono>{" "}
								— align with <Mono dark={appearanceDark}>~/.honcho/config.json</Mono> and Hermes when you share
								memory.
							</li>
							<li>
								Disable mirror: <Mono dark={appearanceDark}>PI_HONCHO_MIRROR=0</Mono> or remove the extension from{" "}
								<Mono dark={appearanceDark}>extensions[]</Mono> in <Mono dark={appearanceDark}>.pi/settings.json</Mono>
								, then <Mono dark={appearanceDark}>/reload</Mono> in Pi.
							</li>
						</ul>
					</div>

					<div className={`mb-4 rounded-lg border p-4 ${card}`}>
						<h3 className="mb-2 font-semibold">Common environment variables</h3>
						<dl className="space-y-2 text-[12px]">
							<div>
								<dt className="font-mono text-[11px] text-[#9cdcfe]">HONCHO_BASE_URL</dt>
								<dd className={sub}>API root, often <Mono dark={appearanceDark}>http://127.0.0.1:18000</Mono>.</dd>
							</div>
							<div>
								<dt className="font-mono text-[11px] text-[#9cdcfe]">HONCHO_JWT</dt>
								<dd className={sub}>When Honcho runs with auth enabled.</dd>
							</div>
						</dl>
					</div>

					<div className={`mb-4 rounded-lg border p-4 ${card}`}>
						<h3 className="mb-2 font-semibold">Install Honcho</h3>
						<p className={`mb-2 text-[12px] ${sub}`}>
							The Way of Pi app does <strong className={appearanceDark ? "text-[#e0e0e0]" : "text-[#111]"}>not</strong> bundle Honcho.
							Install Docker, then clone the official server and follow its README (Docker /{" "}
							<Mono dark={appearanceDark}>docker-compose.yml.example</Mono>):
						</p>
						<pre
							className={`mb-2 overflow-x-auto rounded border p-3 font-mono text-[11px] ${
								appearanceDark ? "border-[#3c3c3c] bg-black/40 text-[#d4d4d4]" : "border-[#ddd] bg-[#f8f8f8] text-[#222]"
							}`}
						>
							git clone https://github.com/plastic-labs/honcho.git ~/honcho-server{"\n"}cd ~/honcho-server{"\n"}cp
							.env.template .env{"\n"}cp docker-compose.yml.example docker-compose.yml{"\n"}
							{"# edit .env, then:\n"}
							docker compose up -d
						</pre>
						<p className={`text-[12px] ${sub}`}>
							Match <Mono dark={appearanceDark}>HONCHO_BASE_URL</Mono> to the port your compose publishes (upstream may differ from{" "}
							<Mono dark={appearanceDark}>18000</Mono>). Managed option:{" "}
							<a href="https://app.honcho.dev" target="_blank" rel="noreferrer" className="text-[#a78bfa] underline">
								app.honcho.dev
							</a>
							. If your checkout defines them, <Mono dark={appearanceDark}>just honcho-up</Mono> /{" "}
							<Mono dark={appearanceDark}>scripts/install-honcho-bin.sh</Mono> are shortcuts from that tree—not from this repo.
						</p>
					</div>

					<div className={`mb-4 rounded-lg border p-4 ${card}`}>
						<h3 className="mb-2 font-semibold">Run the Honcho stack</h3>
						<p className={`mb-2 text-[12px] ${sub}`}>
							After install, from your Honcho checkout (many people use <Mono dark={appearanceDark}>~/honcho-server</Mono>; folder
							name is yours). If your tree has a <Mono dark={appearanceDark}>justfile</Mono>:
						</p>
						<pre
							className={`overflow-x-auto rounded border p-3 font-mono text-[11px] ${
								appearanceDark ? "border-[#3c3c3c] bg-black/40 text-[#d4d4d4]" : "border-[#ddd] bg-[#f8f8f8] text-[#222]"
							}`}
						>
							cd ~/honcho-server{"\n"}just honcho-up
						</pre>
						<p className={`mt-2 text-[12px] ${sub}`}>
							If <Mono dark={appearanceDark}>just honcho-up</Mono> does not exist, keep using <Mono dark={appearanceDark}>docker compose up -d</Mono> from the
							upstream README.
						</p>
					</div>

					<div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
						<a
							href={integrationDocUrl}
							target="_blank"
							rel="noreferrer"
							className={`inline-flex items-center justify-center gap-1.5 rounded border px-3 py-2 text-[12px] font-medium no-underline ${
								appearanceDark
									? "border-[#454545] bg-[#2d2d2d] text-[#cccccc] hover:bg-[#3c3c3c]"
									: "border-[#ccc] bg-white text-[#222] hover:bg-[#f5f5f5]"
							}`}
						>
							Integration guide (this repo)
							<ExternalLink size={14} className="opacity-80" aria-hidden />
						</a>
						<a
							href="https://docs.honcho.dev"
							target="_blank"
							rel="noreferrer"
							className={`inline-flex items-center justify-center gap-1.5 rounded border px-3 py-2 text-[12px] font-medium no-underline ${
								appearanceDark
									? "border-[#454545] bg-[#2d2d2d] text-[#cccccc] hover:bg-[#3c3c3c]"
									: "border-[#ccc] bg-white text-[#222] hover:bg-[#f5f5f5]"
							}`}
						>
							Honcho docs (official)
							<ExternalLink size={14} className="opacity-80" aria-hidden />
						</a>
						<a
							href="https://github.com/plastic-labs/honcho"
							target="_blank"
							rel="noreferrer"
							className={`inline-flex items-center justify-center gap-1.5 rounded border px-3 py-2 text-[12px] font-medium no-underline ${
								appearanceDark
									? "border-[#454545] bg-[#2d2d2d] text-[#cccccc] hover:bg-[#3c3c3c]"
									: "border-[#ccc] bg-white text-[#222] hover:bg-[#f5f5f5]"
							}`}
						>
							Honcho server (GitHub)
							<ExternalLink size={14} className="opacity-80" aria-hidden />
						</a>
					</div>
				</div>
			</div>
		</div>
	);
}
