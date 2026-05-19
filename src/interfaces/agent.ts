/**
 * Agent Interface
 *
 * @description Defines the structure for Way of Pi agents including metadata
 * @export AgentMeta
 *
 * @example
 * ```typescript
 * const agent: AgentMeta = {
 *   id: 'agent-1',
 *   name: 'Pi Agent',
 *   role: 'orchestrator',
 *   model: 'pi-v1',
 *   capabilities: ['bash', 'plan', 'code'],
 *   isActive: true,
 *   description: 'Main orchestrator agent',
 *   relativePath: '/.pi',
 *   tools: ['bash', 'code', 'plan', 'fs']
 * };
 * ```
 */

export interface AgentMeta {
	/** Unique identifier for the agent */
	id: string;

	/** Agent display name */
	name: string;

	/** Agent role (orchestrator, model, etc.) */
	role: string;

	/** LLM model used by this agent */
	model: string;

	/** Capabilities enabled for this agent */
	capabilities: string[];

	/** Whether this agent is active/running */
	isActive: boolean;

	/** Agent description */
	description?: string;

	/** Relative path for this agent */
	relativePath?: string;

	/** Available tools */
	tools?: string[];
}

export interface Agent extends AgentMeta {
	/** When this agent was last used */
	lastUsed?: Date;

	/** Agent plan artifact if active */
	plan?: PlanArtifact;
}

export interface PlanArtifact {
	/** Plan slug identifier */
	slug: string;

	/** Plan title */
	title: string;

	/** Plan status */
	status: "bootstrapping" | "running" | "completed" | "failed";

	/** Plan progress percentage */
	progress: number;
}
