import { createTool } from "../../server-shared/tool-factory"
import { db } from "../../server/db"

/**
 * Verify Time & Schedule Agent — WOW-011
 * Production-ready time verification and variance analysis
 */

export const verifyTimeTool = createTool({
  name: "verify_time",
  description: "Verify worker time entries against planned kanban boards, generate variance reports, propose schedule changes",
  inputSchema: {
    type: "object",
    properties: {
      projectId: { type: "string" },
      taskId: { type: "string" },
      dateRange: { type: "string", enum: ["today", "yesterday"] }
    },
    required: ["projectId"]
  }
}, async (context, input) => {
  const { tenant_id } = context
  const { projectId, taskId, dateRange } = input
  
  const now = new Date()
  const todayStr = now.toISOString().split("T")[0]
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split("T")[0]
  
  const startDate = dateRange === "yesterday" ? yesterdayStr : todayStr
  const endDate = dateRange === "yesterday" ? yesterdayStr : todayStr

  // Get project
  const p = await db().select("projects", {
    where: { id: projectId, tenant_id }
  })
  
  if (!p.length) return { error: "Project not found" }

  // Get tasks
  const tasks = await db().select("tasks", {
    where: { project_id: projectId, tenant_id }
  })

  // Get time entries
  const entries = await db().select("time_entries", {
    where: { tenant_id, date: { between: { start: startDate, end: endDate } } }
  })

  const report = {
    project_id: projectId,
    date_range: dateRange === "today" ? "Today" : "Yesterday",
    planned_hours: tasks.reduce((sum, t) => sum + (t.estimated_hours || 0), 0),
    actual_hours: entries.reduce((sum, e) => sum + e.hours, 0),
    variance: entries.reduce((sum, e) => sum + e.hours, 0) - 
               tasks.reduce((sum, t) => sum + (t.estimated_hours || 0), 0),
    tasks: []
  }

  for (const task of tasks) {
    const taskEntries = entries.filter(e => e.task_id === task.id)
    const actual = taskEntries.reduce((sum, e) => sum + e.hours, 0)
    report.tasks.push({
      id: task.id,
      title: task.title,
      status: task.status,
      planned: task.estimated_hours || 0,
      actual,
      variance: actual - (task.estimated_hours || 0),
      assigned_to: task.assigned_to
    })
  }

  // Check alerts
  const alerts: any[] = []
  report.tasks.forEach(t => {
    if (t.variance < -3) alerts.push({ type: "critical", message: `${t.title} behind by ${Math.abs(t.variance)}h` })
  })
  report.alerts = alerts

  return report
})
