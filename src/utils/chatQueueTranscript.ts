import type { Dispatch, SetStateAction } from "react";

export type ChatQueueItem = { id: string; text: string };

type ChatRowLike = {
	id: string;
	role: "user" | "assistant";
	content: string;
	timestamp: string;
	queueId?: string;
};

function tailMatchesAfterDropFirst(prev: ChatQueueItem[], next: ChatQueueItem[]): boolean {
	if (prev.length !== next.length + 1) return false;
	if (next.length === 0) return true;
	return next.every((n, i) => {
		const p = prev[i + 1];
		return p != null && p.id === n.id && p.text === n.text;
	});
}

function sameMultisetIds(a: ChatQueueItem[], b: ChatQueueItem[]): boolean {
	if (a.length !== b.length) return false;
	const sa = [...a.map((x) => x.id)].sort().join("\0");
	const sb = [...b.map((x) => x.id)].sort().join("\0");
	return sa === sb;
}

/** Apply server queue snapshot to transcript rows (queued user bubbles use `queueId`). */
export function reconcileQueuedTranscript(
	prevSnap: ChatQueueItem[],
	nextSnap: ChatQueueItem[],
	tabId: string,
	setRowsByTab: Dispatch<SetStateAction<Record<string, ChatRowLike[]>>>,
): void {
	if (prevSnap.length === 0 && nextSnap.length === 0) return;

	// Dequeue: first pending item started (still same rows; clear queueId on that bubble).
	if (tailMatchesAfterDropFirst(prevSnap, nextSnap)) {
		const dropped = prevSnap[0]!;
		setRowsByTab((prev) => {
			const R = prev[tabId] ?? [];
			const idx = R.findIndex((r) => r.role === "user" && r.queueId === dropped.id);
			if (idx === -1) return prev;
			const copy = [...R];
			copy[idx] = { ...copy[idx], queueId: undefined };
			return { ...prev, [tabId]: copy };
		});
		return;
	}

	// Same order — text edits only.
	if (
		prevSnap.length === nextSnap.length &&
		prevSnap.length > 0 &&
		prevSnap.every((p, i) => p.id === nextSnap[i]?.id)
	) {
		let changed = false;
		for (let i = 0; i < nextSnap.length; i++) {
			if (prevSnap[i]!.text !== nextSnap[i]!.text) changed = true;
		}
		if (!changed) return;
		setRowsByTab((prev) => {
			const R = prev[tabId] ?? [];
			const byId = new Map(nextSnap.map((n) => [n.id, n.text] as const));
			const copy = R.map((row) => {
				if (row.role !== "user" || !row.queueId) return row;
				const t = byId.get(row.queueId);
				if (t == null || t === row.content) return row;
				return { ...row, content: t };
			});
			return { ...prev, [tabId]: copy };
		});
		return;
	}

	// Reorder only (same ids, different order) — e.g. force-to-front while busy.
	if (
		prevSnap.length > 0 &&
		sameMultisetIds(prevSnap, nextSnap) &&
		prevSnap.some((p, i) => p.id !== nextSnap[i]?.id)
	) {
		const order = nextSnap.map((n) => n.id);
		const idSet = new Set(order);
		setRowsByTab((prev) => {
			const R = prev[tabId] ?? [];
			const qRows = order
				.map((id) => R.find((r) => r.role === "user" && r.queueId === id))
				.filter((r): r is ChatRowLike => r != null);
			if (qRows.length !== order.length) return prev;
			const rest = R.filter((r) => !(r.role === "user" && r.queueId && idSet.has(r.queueId)));
			return { ...prev, [tabId]: [...rest, ...qRows] };
		});
		return;
	}

	// Deletes (or clear queue): remove rows for ids gone from the server snapshot.
	const nextIds = new Set(nextSnap.map((n) => n.id));
	const removedIds = prevSnap.filter((p) => !nextIds.has(p.id)).map((p) => p.id);
	if (removedIds.length > 0) {
		const rm = new Set(removedIds);
		setRowsByTab((prev) => {
			const R = prev[tabId] ?? [];
			const copy = R.filter((row) => !(row.role === "user" && row.queueId && rm.has(row.queueId)));
			return { ...prev, [tabId]: copy };
		});
	}
}
