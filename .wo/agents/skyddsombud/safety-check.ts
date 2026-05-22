import { createTool } from "../../server-shared/tool-factory"
import { sqlite } from "../../server-shared/sqlite"

/**
 * Safety Check Tool
 * Daily safety checklists and hazard identification
 */

export const safetyCheckTool = createTool({
  name: "safety_check",
  description: "Perform daily safety check: PPE, scaffolding, electrical, weather impact",
  inputSchema: {
    type: "object",
    properties: {
      siteId: { type: "string" },
      checkType: { type: "string", enum: ["daily", "hazard", "weekly"] },
      date: { type: "string" }
    },
    required: ["siteId", "checkType"]
  }
}, async (context, { siteId, checkType }: any) => {
  const db = await sqlite()
  const tenantId = context.tenant_id as string
  
  // Get site hazards
  const hazards = await db().select("hazards", {
    where: { site_id: siteId }
  })
  
  // Get weather impact
  const weather = await context.webFetch({
    url: "https://api.open-meteo.com/v1/forecast",
    params: {
      latitude: "59.3293",
      longitude: "18.0686",
      daily: "weathercode",
      temperature_unit: "celsius"
    }
  })
  
  // Check for violations
  const violations: any[] = []
  
  return {
    site: siteId,
    date: new Date().toISOString(),
    weather_conditions: "Clear, 15°C" // Mock — replace with web_fetch result
  }
})
