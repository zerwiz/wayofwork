export function json(data: unknown, status = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			"Content-Type": "application/json; charset=utf-8",
			"Cache-Control": "no-store",
		},
	});
}

export function logLine(
	level: "INFO" | "WARN" | "SUCCESS" | "ERROR",
	source: string,
	msg: string,
): string {
	const time = new Date().toISOString().split("T")[1]?.slice(0, 12) ?? "";
	return JSON.stringify({ type: "log", time, level, source, msg });
}
