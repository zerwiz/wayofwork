import { createTool } from "../../server-shared/tool-factory"
import { sqlite } from "../../server-shared/sqlite"

/**
 * Equipment Tools
 */

// Equipment check
export const equipmentCheck = createTool({
  name: "equipment_check",
  description: "Check equipment inventory and availability",
  inputSchema: {
    type: "object",
    properties: {
      equipment_type: { type: "string", enum: ["crane", "excavator", "scaffolding", "forklift"] },
      status: { type: "string", enum: ["available", "in_use", "maintenance"] }
    },
    required: ["equipment_type"]
  }
}, async (context, { equipment_type }: any) => {
  const db = await sqlite()
  const items = await db().select("equipment", { where: { type: equipment_type } })
  
  return {
    equipment_type,
    total: 5,
    available: 3,
    in_use: 2,
    scheduled_maintenance: Date.now() / 1000 + 1729732800000
  }
})
