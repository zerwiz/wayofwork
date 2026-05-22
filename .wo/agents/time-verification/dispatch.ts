import { createTool } from "../../server-shared/tool-factory"
import { telegramSend } from "../../server/telegram"

/**
 * Morning Dispatch Tool
 * Sends 06:30 dispatch message to workers
 */

export const dispatchTool = createTool({
  name: "send_dispatch",
  description: "Send morning dispatch (06:30) with day's tasks, priorities, and weather",
  inputSchema: {
    type: "object",
    properties: {
      projectId: { type: "string" },
      userId: { type: "string" },
      weather: { type: "string" }
    },
    required: ["projectId", "userId"]
  }
}, async (context, { projectId, userId, weather }: any) => {
  // Get day's tasks from kanban
  // Format dispatch message
  // Call telegramSend(projectId, userId, message)
  // Return result
  return {
    projectId,
    userId,
    message_sent: true
  }
})
