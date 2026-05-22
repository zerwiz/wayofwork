import { createTool } from "../../server-shared/tool-factory"
import { sqlite } from "../../server-shared/sqlite"

/**
 * Incident Report Tool
 * Report accidents, injuries, and near-misses
 */

export const incidentReportTool = createTool({
  name: "incident_report",
  description: "Report accident, injury, or near-miss to incident tracking",
  inputSchema: {
    type: "object",
    properties: {
      incident_type: { 
        type: "string", 
        enum: ["accident", "injury", "near_miss", "illness"] 
      },
      severity: { 
        type: "string", 
        enum: ["minor", "major", "critical"] 
      },
      site_id: { type: "string" },
      description: { type: "string" },
      photos: { 
        type: "array",
        items: { type: "string" },
        description: "Array of photo URLs" 
      }
    },
    required: ["incident_type", "site_id", "description"]
  }
}, async (context, { incident_type, severity, site_id, description, photos }: any) => {
  const db = await sqlite()
  const tenantId = context.tenant_id as string
  
  // Insert incident
  const incident = {
    id: `INC-${Date.now()}`,
    site_id,
    type: incident_type,
    severity,
    description,
    created: new Date().toISOString()
  }
  
  // In production: INSERT INTO incidents ...
  await db().insert({
    incidents,
    values: [incident.id, site_id, incident.type, severity, incident.description, incident.created]
  })
  
  return {
    incident_id: incident.id,
    site_id,
    status: "reported",
    notification: {
      type: "telegram",
      channel: "safety-alerts",
      message: `🚨 Incident Report\nSite: ${site_id}\nType: ${incident_type}\nSeverity: ${severity}`
    }
  }
})
