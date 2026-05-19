import { useState, useCallback } from "react";

interface Prediction {
  id: string;
  type: "task_completion" | "budget_overrun" | "worker_performance" | "project_delay";
  title: string;
  description: string;
  confidence: number; // 0-100
  severity: "low" | "medium" | "high";
  createdAt: string;
}

interface WorkerPerformance {
  workerId: string;
  workerName: string;
  completionRate: number; // 0-100
  averageHoursPerTask: number;
  totalTasks: number;
  completedTasks: number;
  trend: "improving" | "stable" | "declining";
}

interface ProjectInsight {
  projectId: string;
  projectName: string;
  estimatedCompletion: string;
  budgetStatus: "on_track" | "at_risk" | "over_budget";
  predictedDelayDays: number;
  recommendations: string[];
}

export function useAIPredictions() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [workerPerformance, setWorkerPerformance] = useState<WorkerPerformance[]>([]);
  const [projectInsights, setProjectInsights] = useState<ProjectInsight[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchPredictions = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("wop_token");
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

      const res = await fetch("/api/ai/predictions", { headers });
      if (!res.ok) throw new Error("Failed to fetch predictions");
      const data = await res.json();
      setPredictions(data.predictions || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load predictions");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchWorkerPerformance = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("wop_token");
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

      const res = await fetch("/api/ai/worker-performance", { headers });
      if (!res.ok) throw new Error("Failed to fetch worker performance");
      const data = await res.json();
      setWorkerPerformance(data.workers || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load worker performance");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProjectInsights = useCallback(async (projectId?: string) => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("wop_token");
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

      const url = projectId
        ? `/api/ai/project-insights?projectId=${projectId}`
        : "/api/ai/project-insights";
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error("Failed to fetch project insights");
      const data = await res.json();
      setProjectInsights(data.projects || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load project insights");
    } finally {
      setLoading(false);
    }
  }, []);

  const generatePrediction = useCallback(
    async (type: string, context: Record<string, unknown>) => {
      try {
        const token = localStorage.getItem("wop_token");
        const headers: Record<string, string> = token
          ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
          : { "Content-Type": "application/json" };

        const res = await fetch("/api/ai/generate-prediction", {
          method: "POST",
          headers,
          body: JSON.stringify({ type, context }),
        });
        if (!res.ok) throw new Error("Failed to generate prediction");
        const data = await res.json();
        return data.prediction;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to generate prediction");
        return null;
      }
    },
    [],
  );

  const refreshPredictions = useCallback(() => {
    return fetchPredictions();
  }, [fetchPredictions]);

  const refreshWorkerPerformance = useCallback(() => {
    return fetchWorkerPerformance();
  }, [fetchWorkerPerformance]);

  const refreshProjectInsights = useCallback(
    (projectId?: string) => {
      return fetchProjectInsights(projectId);
    },
    [fetchProjectInsights],
  );

  return {
    predictions,
    workerPerformance,
    projectInsights,
    loading,
    error,
    refreshPredictions,
    refreshWorkerPerformance,
    refreshProjectInsights,
    generatePrediction,
  };
}
