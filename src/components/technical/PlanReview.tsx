import { useCallback, useEffect, useState } from "react";
import { apiGet } from "../../api/client";
import type { ChatSessionMode } from "../../hooks/useWayOfPiSession";

export function PlanReview({ mode }: { mode: ChatSessionMode }) {
  const [planText, setPlanText] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchPlan = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiGet<{ content: string }>("/api/plans/current");
      setPlanText(res.content);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load on mount
  useEffect(() => {
    fetchPlan();
  }, []);

  return (
    <div className="p-2 bg-[#252526] text-[#cccccc]">
      <h3 className="text-[#858585] mb-2">Plan Review</h3>
      {loading ? (
        <p>Loading plan…</p>
      ) : (
        <div className="border border-[#3c3c3c] rounded p-2 min-h-[200px] overflow-auto">
          <pre className="whitespace-pre-wrap">{planText}</pre>
        </div>
      )}
    </div>
  );
}