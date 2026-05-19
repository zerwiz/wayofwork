import { X } from "lucide-react";

const VSC_DEBUGGING_DOC = "https://code.visualstudio.com/docs/editor/debugging";
const DAP_OVERVIEW = "https://microsoft.github.io/debug-adapter-protocol/overview";

const MP_BASE = "https://marketplace.visualstudio.com";
const MARKETPLACE_DEBUGGERS_SEARCH = `${MP_BASE}/search?target=Microsoft.VisualStudio.Code&category=Debuggers&sortBy=Installs`;

function marketplaceItem(itemName: string): string {
	return `${MP_BASE}/items?itemName=${encodeURIComponent(itemName)}`;
}

/** Curated extensions (VS Code marketplace; Cursor installs the same extensions). */
const CURATED_DEBUG_EXTENSIONS: { itemName: string; label: string; hint: string }[] = [
	{ itemName: "ms-python.debugpy", label: "Python Debugger (debugpy)", hint: "Microsoft — pairs with Run → Add Configuration (Python)." },
	{ itemName: "vadimcn.vscode-lldb", label: "CodeLLDB", hint: "C++, Rust, and other native targets via LLDB." },
	{ itemName: "golang.go", label: "Go", hint: "Delve-based debugging for Go modules." },
	{ itemName: "oven.bun-vscode", label: "Bun for VS Code", hint: "Official Oven extension; Bun launch type in launch.json (see bun.sh VS Code debugger guide)." },
	{ itemName: "vscjava.vscode-java-debug", label: "Debugger for Java", hint: "Red Hat / Java extension pack workflow." },
	{ itemName: "xdebug.php-debug", label: "PHP Debug", hint: "Xdebug adapter for PHP." },
	{ itemName: "ms-dotnettools.csdevkit", label: "C# Dev Kit", hint: ".NET debugging in VS Code / Cursor." },
	{ itemName: "Shopify.ruby-lsp", label: "Ruby LSP", hint: "Ruby language server + debugging path in modern setups." },
];

async function openLearnUrl(href: string): Promise<void> {
	try {
		if (typeof window !== "undefined" && window.wopShell?.openExternalUrl) {
			await window.wopShell.openExternalUrl(href);
			return;
		}
	} catch {
		/* fall through */
	}
	window.open(href, "_blank", "noopener,noreferrer");
}

/**
 * Same idea as VS Code / Cursor **Run → Install Additional Debuggers…**:
 * full breakpoint debugging for most languages uses **DAP** extensions in the desktop editor;
 * Way of Pi can still edit `launch.json` and use the integrated terminal for quick runs.
 */
export function InstallDebuggersModal({
	open,
	onDismiss,
	appearanceDark = true,
}: {
	open: boolean;
	onDismiss: () => void;
	/** Match Simple / Claw appearance and shared modal styling (`llmFixModalAppearanceDark` in App). */
	appearanceDark?: boolean;
}) {
	const panel = appearanceDark
		? "border-[#454545] bg-[#252526] text-[#cccccc]"
		: "border-[#e5e5e5] bg-white text-[#333333]";
	const headerRow = appearanceDark
		? "flex shrink-0 items-center justify-between border-b border-[#3c3c3c] px-4 py-3"
		: "flex shrink-0 items-center justify-between border-b border-[#e5e5e5] px-4 py-3";
	const titleClass = appearanceDark
		? "text-[15px] font-semibold text-white"
		: "text-[15px] font-semibold text-[#111827]";
	const closeBtn = appearanceDark
		? "rounded p-1 text-[#858585] hover:bg-[#3c3c3c] hover:text-[#cccccc]"
		: "rounded p-1 text-[#616161] hover:bg-[#e5e5e5] hover:text-[#333333]";
	const muted = appearanceDark ? "text-[#858585]" : "text-[#616161]";
	const strongBody = appearanceDark ? "text-[#cccccc]" : "text-[#111827]";
	const linkClass = appearanceDark ? "text-[#3794ff] underline" : "text-[#2563eb] underline";
	const codeClass = appearanceDark ? "text-[#9cdcfe]" : "text-[#0369a1]";
	const primaryBtn = appearanceDark
		? "rounded bg-[#007acc] px-3 py-1.5 text-[12px] text-white hover:bg-[#006bb3]"
		: "rounded bg-[#2563eb] px-3 py-1.5 text-[12px] text-white hover:bg-[#1d4ed8]";
	const secondaryBtn = appearanceDark
		? "rounded border border-[#454545] px-3 py-1.5 text-[12px] text-[#cccccc] hover:bg-[#2a2d2e]"
		: "rounded border border-[#d1d5db] px-3 py-1.5 text-[12px] text-[#333333] hover:bg-[#f3f4f6]";
	const sectionLabel = appearanceDark
		? "mb-2 text-[10px] font-bold uppercase tracking-wide text-[#858585]"
		: "mb-2 text-[10px] font-bold uppercase tracking-wide text-[#6b7280]";
	const listItemBtn = appearanceDark
		? "flex w-full flex-col items-start rounded border border-transparent px-2 py-2 text-left hover:border-[#007acc]/40 hover:bg-[#2a2d2e]"
		: "flex w-full flex-col items-start rounded border border-transparent px-2 py-2 text-left hover:border-[#7c3aed]/35 hover:bg-[#f3f4f6]";
	const listTitle = appearanceDark ? "text-[13px] font-medium text-[#e0e0e0]" : "text-[13px] font-medium text-[#111827]";
	const listHint = appearanceDark ? "mt-0.5 text-[11px] text-[#858585]" : "mt-0.5 text-[11px] text-[#6b7280]";
	const listMono = appearanceDark ? "mt-0.5 font-mono text-[10px] text-[#6a9955]" : "mt-0.5 font-mono text-[10px] text-[#15803d]";
	const footerRow = appearanceDark
		? "shrink-0 border-t border-[#3c3c3c] px-4 py-3"
		: "shrink-0 border-t border-[#e5e5e5] px-4 py-3";
	const footerClose = appearanceDark
		? "rounded bg-[#3c3c3c] px-4 py-2 text-[13px] text-[#cccccc] hover:bg-[#505050]"
		: "rounded border border-[#e5e5e5] bg-[#f3f3f3] px-4 py-2 text-[13px] text-[#333333] hover:bg-[#e5e5e5]";

	if (!open) return null;

	return (
		<div
			className="fixed inset-0 z-[20000] flex items-center justify-center bg-black/60 p-4"
			role="presentation"
			onMouseDown={(e) => {
				if (e.target === e.currentTarget) onDismiss();
			}}
		>
			<div
				className={`flex max-h-[min(90vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-xl border shadow-2xl ${panel}`}
				role="dialog"
				aria-labelledby="install-dbg-title"
				aria-modal="true"
				onMouseDown={(e) => e.stopPropagation()}
			>
				<div className={headerRow}>
					<h2 id="install-dbg-title" className={titleClass}>
						Install additional debuggers
					</h2>
					<button
						type="button"
						onClick={onDismiss}
						className={closeBtn}
						aria-label="Close"
					>
						<X size={20} />
					</button>
				</div>
				<div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
					<p className={`mb-3 text-[12px] leading-relaxed ${muted}`}>
						In <strong className={strongBody}>Cursor</strong> and <strong className={strongBody}>VS Code</strong>,{" "}
						<em>Install Additional Debuggers</em> points you at the{" "}
						<a
							href={MARKETPLACE_DEBUGGERS_SEARCH}
							className={linkClass}
							target="_blank"
							rel="noreferrer"
							onClick={(e) => {
								e.preventDefault();
								void openLearnUrl(MARKETPLACE_DEBUGGERS_SEARCH);
							}}
						>
							Marketplace “Debuggers” category
						</a>
						. Extensions implement the{" "}
						<a
							href={DAP_OVERVIEW}
							className={linkClass}
							target="_blank"
							rel="noreferrer"
							onClick={(e) => {
								e.preventDefault();
								void openLearnUrl(DAP_OVERVIEW);
							}}
						>
							Debug Adapter Protocol (DAP)
						</a>{" "}
						so the editor gets breakpoints, stacks, and variables. Way of Pi focuses on the workspace shell and terminal;
						install the extensions <strong className={strongBody}>in Cursor</strong> for this repo, then use{" "}
						<strong className={strongBody}>Run → Open Configurations</strong> here to edit the same{" "}
						<code className={codeClass}>launch.json</code>.
					</p>
					<div className="mb-3 flex flex-wrap gap-2">
						<button
							type="button"
							className={primaryBtn}
							onClick={() => void openLearnUrl(MARKETPLACE_DEBUGGERS_SEARCH)}
						>
							Browse all debugger extensions
						</button>
						<button
							type="button"
							className={secondaryBtn}
							onClick={() => void openLearnUrl(VSC_DEBUGGING_DOC)}
						>
							VS Code debugging overview
						</button>
					</div>
					<p className={sectionLabel}>Popular extensions</p>
					<ul className="m-0 list-none space-y-1 p-0">
						{CURATED_DEBUG_EXTENSIONS.map((row) => (
							<li key={row.itemName}>
								<button
									type="button"
									className={listItemBtn}
									onClick={() => void openLearnUrl(marketplaceItem(row.itemName))}
								>
									<span className={listTitle}>{row.label}</span>
									<span className={listHint}>{row.hint}</span>
									<span className={listMono}>{row.itemName}</span>
								</button>
							</li>
						))}
					</ul>
				</div>
				<div className={footerRow}>
					<button
						type="button"
						onClick={onDismiss}
						className={footerClose}
					>
						Close
					</button>
				</div>
			</div>
		</div>
	);
}
