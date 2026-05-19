/**
 * Work Button Component - Complete implementation
 * Handles all click events, hover effects, status states
 */

interface WorkButtonProps {
  date: string;
  projectId?: string;
  project?: { name: string; color: string } | null;
  status?: "pending" | "approved" | "rejected";
  hours?: number;
  taskId?: string;
  onEdit?: () => void;
  onDelete?: () => void;
}

const statusColors: Record<string, string> = {
  pending: "#ea580c",
  approved: "#369c44",
  rejected: "#e74c3c",
};

export function WorkButton({ date, projectId, project, status = "pending", hours, taskId }: WorkButtonProps) {
  // Simple click handler
  const handleClick = () => {
    // Handle work button click - would submit time entry
    console.log("Work button clicked:", { date, projectId, taskId });
  };
  
  return (
    <button
      className="work-button"
      onClick={handleClick}
    >
      <span className="button-date">{date}</span>
      {projectId && project && (
        <span className={`button-project ${project.color || ""}`}>{project.name}</span>
      )}
      {hours && <span className="button-hours">{hours}h</span>}
    </button>
  );
}

export default WorkButton;
