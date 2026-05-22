import { getAgentBodyByName, resolveAgentSkillsFromName } from "./agents";
import { runSdkChatTurn } from "./sdk-runtime";
import { getPrimaryWorkspacePath } from "./workspace-state";
import type { ChatMessage } from "./chat";

export interface DispatchResult {
	ok: boolean;
	output: string;
	error?: string;
}

/**
 * Dispatch a task to a specialized sub-agent.
 * Runs in an isolated ephemeral session.
 */
export async function dispatchToAgent(
	agentName: string,
	task: string,
	tenantId: string,
	userId: string,
	userName: string
): Promise<DispatchResult> {
	try {
		const agentBody = await getAgentBodyByName(agentName, tenantId);
		if (!agentBody) {
			return { ok: false, output: "", error: `Agent '${agentName}' not found.` };
		}

		const skills = await resolveAgentSkillsFromName(agentName, tenantId);
		const systemPrompt = [
			agentBody,
			skills ? `\n\n---\n\n${skills}` : "",
			`\n\nYou are working as a sub-agent for the Orchestrator.`,
			`User: ${userName} (${userId})`,
			`Tenant: ${tenantId}`,
			`Your goal is to complete the following task and return a final concise result.`,
		].join("\n");

		const messages: ChatMessage[] = [
			{ role: "system", content: systemPrompt },
			{ role: "user", content: task },
		];

		let fullResponse = "";
		const cwd = getPrimaryWorkspacePath(tenantId);

		const r = await runSdkChatTurn({
			cwd,
			messages,
			onDelta: (s) => { fullResponse += s; },
			onLog: () => {},
		});

		if (r.result.ok) {
			return { ok: true, output: fullResponse.trim() };
		}
		return { ok: false, output: "", error: r.result.error || "Sub-agent execution failed." };
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);
		return { ok: false, output: "", error: message };
	}
}
