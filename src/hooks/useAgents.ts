/**
 * useAgents Hook
 *
 * @description Manages agent API connections, catalog operations, and team state
 * @returns Object containing basic agent state
 */

import { useState, useCallback, useMemo, useEffect } from "react";

const STORAGE_KEY = "wop-agents-api";

export interface AgentMeta {
	id: string;
	name: string;
	role: string;
	model: string;
	capabilities: string[];
	isActive: boolean;
	description?: string;
	relativePath?: string;
	tools?: string[];
}

export interface Agent extends AgentMeta {
	lastUsed?: Date;
	plan?: PlanArtifact;
}

export interface PlanArtifact {
	slug: string;
	title: string;
	status: "bootstrapping" | "running" | "completed" | "failed";
	progress: number;
}

export interface UseAgentsReturn {
	agentsApi: AgentAPI;
	reloadAgentsCatalog: () => Promise<void>;
	agentCount: number;
	isRefreshing: boolean;
	data: { teamsPath?: string; agents: Agent[]; plan?: PlanArtifact; teams?: Record<string, string[]> } | null;
	loading: boolean;
	reload: () => Promise<void>;
	error: string | null;
	teams: { name: string; agents: Agent[] }[];
}

export interface AgentTeamMap {
	[name: string]: string[];
}

export interface AgentAPI {
	data: { teamsPath?: string; agents: Agent[]; plan?: PlanArtifact } | null;
	reload: () => Promise<void>;
	addAgent: (agent: Omit<Agent, "id" | "lastUsed">) => Promise<void>;
	updateAgent: (id: string, agent: Partial<Agent>) => Promise<void>;
	removeAgent: (id: string) => Promise<void>;
	getTeamMap: () => AgentTeamMap | null;
}

export function useAgents(): UseAgentsReturn {
	const [agentsData, setAgentsData] = useState<{
		teamsPath?: string;
		agents: Agent[];
		plan?: PlanArtifact;
	} | null>(null);

	const [isRefreshing, setIsRefreshing] = useState(false);

	const loadFromStorage = (): {
		teamsPath?: string;
		agents: Agent[];
		plan?: PlanArtifact;
	} | null => {
		try {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (stored) {
				return JSON.parse(stored) as {
					teamsPath?: string;
					agents: Agent[];
					plan?: PlanArtifact;
				};
			}
		} catch {
			// Storage not available or parse error
		}
		return null;
	};

	const saveToStorage = (
		data: { teamsPath?: string; agents: Agent[]; plan?: PlanArtifact } | null,
	) => {
		try {
			if (data) {
				localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
			} else {
				localStorage.removeItem(STORAGE_KEY);
			}
		} catch {
			// Storage might not be available
		}
	};

	const fetchAgents = useCallback(async () => {
		await new Promise((resolve) => setTimeout(resolve, 100));
		const stored = loadFromStorage();
		saveToStorage(stored);
		return stored || { agents: [], teamsPath: undefined, plan: undefined };
	}, []);

	const getTeamMap = useCallback((): AgentTeamMap | null => {
		if (!agentsData) return null;
		const teams = new Map<string, Agent[]>();

		for (const agent of agentsData.agents) {
			const role = agent.role || "default";
			teams.set(role, [...(teams.get(role) || []), agent]);
		}

		const result: AgentTeamMap = {};
		for (const [role, members] of teams) {
			result[role] = members.map((a) => a.name);
		}
		return result;
	}, [agentsData]);

	const agentsApi: AgentAPI = useMemo(() => ({
		get data() {
			if (!agentsData) return null;
			const teams: Record<string, string[]> = {};
			for (const agent of agentsData.agents) {
				const role = agent.role || "default";
				if (!teams[role]) teams[role] = [];
				teams[role].push(agent.name);
			}
			return { ...agentsData, teams };
		},
		reload: async () => {
			setIsRefreshing(true);
			try {
				const stored = await fetchAgents();
				setAgentsData(stored);
				saveToStorage(stored);
			} catch (error) {
				console.warn("Failed to reload agents:", error);
			} finally {
				setIsRefreshing(false);
			}
		},
		addAgent: async (newAgent: Omit<Agent, "id" | "lastUsed">) => {
			try {
				const agent: Agent = {
					...newAgent,
					id: Date.now().toString(),
					isActive: true,
					lastUsed: new Date(),
				};
				const currentAgentList = agentsData?.agents || [];
				const updatedAgentList = [...currentAgentList, agent];

				const updatedData: {
					teamsPath?: string;
					agents: Agent[];
					plan?: PlanArtifact;
				} = agentsData
					? { ...agentsData, agents: updatedAgentList }
					: { agents: updatedAgentList };

				setAgentsData(updatedData);
				saveToStorage(updatedData);
			} catch (error) {
				console.warn("Failed to add agent:", error);
			}
		},
		updateAgent: async (id: string, newValues: Partial<Agent>) => {
			try {
				const currentAgentList = agentsData?.agents || [];
				const filteredAgents = currentAgentList.filter((a) => a.id !== id);
				const updatedAgentList = [
					...filteredAgents,
					{
						id,
						...agentsData?.agents?.find((a) => a.id === id),
						...newValues,
					} as Agent,
				];

				const updatedData: {
					teamsPath?: string;
					agents: Agent[];
					plan?: PlanArtifact;
				} = agentsData
					? { ...agentsData, agents: updatedAgentList }
					: { agents: updatedAgentList };

				setAgentsData(updatedData);
				saveToStorage(updatedData);
			} catch (error) {
				console.warn("Failed to update agent:", error);
			}
		},
		removeAgent: async (id: string) => {
			try {
				const currentAgentList = agentsData?.agents || [];
				const updatedAgentList = currentAgentList.filter((a) => a.id !== id);

				const updatedData: {
					teamsPath?: string;
					agents: Agent[];
					plan?: PlanArtifact;
				} = agentsData
					? { ...agentsData, agents: updatedAgentList }
					: { agents: updatedAgentList };

				setAgentsData(updatedData);
				saveToStorage(updatedData);
			} catch (error) {
				console.warn("Failed to remove agent:", error);
			}
		},
		getTeamMap,
	}), [agentsData, fetchAgents]);

	const loading = isRefreshing;
	const reload = agentsApi.reload;
	const error: string | null = null;
	const teamsVal = agentsApi.data
		? agentsApi
				.getTeamMap()
				? Object.entries(agentsApi.getTeamMap()!).map(([name, agents]) => ({
						name,
						agents: agentsData?.agents.filter((a) => agents.includes(a.name)) || [],
				  }))
				: []
		: [];

	return {
		agentsApi,
		reloadAgentsCatalog: agentsApi.reload,
		agentCount: agentsApi.data?.agents.length || 0,
		isRefreshing,
		data: agentsApi.data,
		loading,
		reload,
		error,
		teams: teamsVal,
	};
}
