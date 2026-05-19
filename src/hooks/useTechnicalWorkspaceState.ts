export type TechnicalActivity = "editing" | "debugging" | "running" | "idle";

export function useTechnicalWorkspaceState() {
  return {
    viewMode: "technical" as const,
    setViewMode: (_mode: string) => {},
  };
}
