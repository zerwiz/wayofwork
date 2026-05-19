/** GET `/api/diagnostics` — host doctor payload (subset; server may add fields). */

export type DoctorCheckStatus = "ok" | "warn" | "error" | "skip" | "info";

export type DoctorCheck = {
	id: string;
	title: string;
	status: DoctorCheckStatus;
	summary: string;
	hint?: string;
};

export type HostDoctorDiagnostics = {
	ok?: boolean;
	error?: string;
	service?: string;
	time?: string;
	playgroundRoot?: string;
	/** Same path as `playgroundRoot`; preferred name — Way of Pi server package / repo checkout, not the user project. */
	wayOfPiBundleRoot?: string;
	workspace?: {
		primary?: string;
		folders?: Array<{ label: string; path: string }>;
		initialRoot?: string | null;
	};
	env?: Record<string, string | boolean | null | undefined>;
	llm?: {
		provider?: string;
		ollamaHost?: string;
		ollama?: Record<string, unknown>;
	};
	piBinary?: Record<string, unknown>;
	manifestStatic?: Record<string, unknown>;
	chatRuntime?: Record<string, unknown>;
	orchestrator?: { tools?: boolean; bash?: boolean };
	checks?: DoctorCheck[];
	doctorSummary?: {
		worst?: "ok" | "warn" | "error";
		errors?: number;
		warnings?: number;
		total?: number;
	};
	note?: string;
};
