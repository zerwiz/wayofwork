import { createTool } from "../../server-shared/tool-factory"
import { sqlite } from "../../server-shared/sqlite"

/**
 * Cost Estimation Tools
 */

// Labor estimation
export const estimateLabor = createTool({
  name: "estimate_labor",
  description: "Estimate labor costs with skill multipliers",
  inputSchema: {
    type: "object",
    properties: {
      task_id: { type: "string" },
      workers: { 
        type: "array",
        items: {
          type: "object",
          properties: {
            worker_id: { type: "string" },
            skill_level: { type: "string", enum: ["basic", "journey", "trade", "manager"] },
            hourly_rate: { type: "number" }
          },
          required: ["worker_id", "skill_level"]
        }
      },
      hours: { type: "number" }
    },
    required: ["task_id", "hours"]
  }
}, async (context, { task_id, workers, hours }: any) => {
  const total_cost = hours * (workers.reduce((sum: number, w: any) => sum + w.hourly_rate || 250, 0))
  const employer_cost = total_cost * 0.313
  
  return {
    task_id,
    labor_cost: total_cost,
    employer_cost,
    pension_cost
  }
})

// Material estimation
export const estimateMaterial = createTool({
  name: "estimate_material",
  description: "Calculate material quantities and costs with waste factors",
  inputSchema: {
    type: "object",
    properties: {
      material_id: { type: "string" },
      quantity: { type: "number" },
      waste_factor: { type: "number", default: 0.1 }
    },
    required: ["material_id", "quantity"]
  }
}, async (context, { material_id, quantity }: any) => {
  const base_cost = quantity * 900 // SEK/m³ concrete
  
  return {
    material_id,
    base_cost,
    waste_cost: base_cost * 0.1,
    total_cost: base_cost * 1.1
  }
})
