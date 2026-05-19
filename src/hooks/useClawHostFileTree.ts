import { useCallback, useEffect, useState } from "react";
import { apiGet } from "../api/client";
import type { TreeNode } from "../types/tree";
import {
	ensureDevWayOfPiApiFresh,
	healthSupportsClawHostTree,
	staleWayOfPiApiMessage,
} from "../utils/wayofpiDevApiWarmup";

export type ClawHostTreeResponse = {
	rootDisplay: string;
	nodes: TreeNode[];
};

export function useClawHostFileTree(enabled: boolean) {
	const [nodes, setNodes] = useState<TreeNode[]>([]);
	const [rootDisplay, setRootDisplay] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const refresh = useCallback(async () => {
		if (!enabled) return;
		setLoading(true);
		setError(null);
		try {
			const caps = await ensureDevWayOfPiApiFresh();
			if (caps !== null && !healthSupportsClawHostTree(caps)) {
				throw new Error(staleWayOfPiApiMessage());
			}

			let data: ClawHostTreeResponse;
			try {
				data = await apiGet<ClawHostTreeResponse>("/api/claw/tree");
			} catch (e1) {
				const m1 = e1 instanceof Error ? e1.message : String(e1);
				if (!/^404\b/.test(m1)) throw e1;
				const cfg = await apiGet<{ clawHostTree?: ClawHostTreeResponse }>("/api/config?clawTree=1");
				const emb = cfg.clawHostTree;
				if (emb && Array.isArray(emb.nodes)) {
					data = {
						rootDisplay: typeof emb.rootDisplay === "string" ? emb.rootDisplay : "",
						nodes: emb.nodes,
					};
				} else {
					throw new Error(
						`${m1} Claw files need GET /api/claw/tree or GET /api/config?clawTree=1 with clawHostTree. ${staleWayOfPiApiMessage()}`,
					);
				}
			}
			setRootDisplay(typeof data.rootDisplay === "string" ? data.rootDisplay : "");
			setNodes(Array.isArray(data.nodes) ? data.nodes : []);
		} catch (e) {
			let msg = e instanceof Error ? e.message : String(e);
			if (/^404\b/.test(msg) && !msg.includes("Another process on the API port")) {
				msg +=
					" Restart the Way of Pi API (e.g. bun run server/index.ts in apps/wayofwork-ui) so GET /api/claw/tree is available.";
			}
			setError(msg);
			setNodes([]);
			setRootDisplay("");
		} finally {
			setLoading(false);
		}
	}, [enabled]);

	useEffect(() => {
		if (!enabled) {
			setNodes([]);
			setRootDisplay("");
			setLoading(false);
			setError(null);
			return;
		}
		void refresh();
	}, [enabled, refresh]);

	return { nodes, rootDisplay, loading, error, refresh };
}
