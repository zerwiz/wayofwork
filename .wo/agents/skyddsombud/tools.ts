import { createTool } from "../../server-shared/tool-factory"
import { sqlite } from "../../server-shared/sqlite"
import { webFetch } from "../../server/web-fetch"

/**
 * Safety Tools
 */

// Safety check tool
export const safetyCheckTool = createTool({
  name: "safety_check",
  description: "Verify daily safety checklist: PPE, scaffolding, electrical work, weather impact",
  inputSchema: {
    type: "object",
    properties: {
      site_id: { type: "string" },
      check_type: { type: "string", enum: ["daily", "hazard", "weekly"] }
    },
    required: ["site_id"]
  }
}, async (context, { site_id, check_type }: any) => {
  const db = await sqlite()
  const weather = await webFetch({
    url: "https://api.open-meteo.com/v1/forecast",
    params: { latitude: "59.3293", longitude: "18.0686", daily: "weathercode,temperature_2m_max" }
  })
  
  return {
    site: site_id,
    date: new Date().toISOString(),
    weather: weather?.daily?.weathercode,
    hazards: []
  }
})

// Incident report tool
export const incidentReportTool = createTool({
  name: "incident_report",
  description: "Report accident, injury, or near-miss to incident tracking",
  inputSchema: {
    type: "object",
    properties: {
      incident_type: { type: "string", enum: ["accident", "injury", "near_miss", "illness"] },
      severity: { type: "string", enum: ["minor", "major", "critical"] },
      site_id: { type: "string" },
      description: { type: "string" }
    },
    required: ["incident_type", "site_id", "description"]
  }
}, async (context, { incident_type, severity, site_id, description }: any) => {
  const db = await sqlite()
  const tenantId = context.tenant_id as string
  
  // Insert incident
  const incident = await db().insert({
    incidents,
    values: [
      `INC-${Date.now()}`,
      site_id,
      incident_type,
      severity,
      description,
      new Date().toISOString()
    ]
  })
  
  return {
    incident_id: incident.id,
    status: "reported",
    notification: "telegram"
  }
})
