import { db } from "./db";
import { notifyUser } from "./notifications";

export function checkConstructionTriggers(tenantId: string) {
  checkWeatherAlerts(tenantId);
  checkId06Expiry(tenantId);
}

function checkWeatherAlerts(tenantId: string) {
  try {
    const lastCheck = db.query("SELECT config_value FROM tenant_configs WHERE tenant_id = ? AND config_key = 'weather_last_check'").get(tenantId) as { config_value: string } | undefined;
    const last = lastCheck ? new Date(lastCheck.config_value) : new Date(0);
    const now = new Date();
    if (now.getTime() - last.getTime() < 3600000) return;
    db.query("INSERT INTO tenant_configs (tenant_id, config_key, config_value) VALUES (?, 'weather_last_check', ?) ON CONFLICT(tenant_id, config_key) DO UPDATE SET config_value = excluded.config_value, updated_at = datetime('now')").run(tenantId, now.toISOString());

    Promise.resolve().then(async () => {
      try {
        const res = await fetch("https://api.open-meteo.com/v1/forecast?latitude=59.3293&longitude=18.0686&current=precipitation,wind_speed_10m&timezone=auto");
        const data = await res.json() as { current?: { precipitation?: number; wind_speed_10m?: number } };
        if (!data.current) return;
        const alerts: string[] = [];
        if ((data.current.precipitation ?? 0) > 5) alerts.push(`Hög nederbörd: ${data.current.precipitation} mm`);
        if ((data.current.wind_speed_10m ?? 0) > 15) alerts.push(`Stark vind: ${data.current.wind_speed_10m} m/s`);
        if (alerts.length === 0) return;
        const admins = db.query("SELECT id FROM users WHERE tenant_id = ? AND (role = 'SUPER_ADMIN' OR role = 'ADMIN')").all(tenantId) as { id: string }[];
        for (const admin of admins) {
          notifyUser({
            tenantId,
            userId: admin.id,
            type: "weather",
            severity: "warning",
            title: "Vädervarning",
            message: alerts.join(". "),
          }).catch(() => {});
        }
      } catch {}
    });
  } catch {}
}

function checkId06Expiry(tenantId: string) {
  const members = db.query("SELECT user_id FROM project_members WHERE tenant_id = ?").all(tenantId) as { user_id: string }[];
  const seen = new Set<string>();
  for (const m of members) {
    if (seen.has(m.user_id)) continue;
    seen.add(m.user_id);
    const expiryStr = (db.query("SELECT config_value FROM tenant_configs WHERE tenant_id = ? AND config_key = ?").get(tenantId, `id06_expiry_${m.user_id}`) as { config_value: string } | undefined)?.config_value;
    if (!expiryStr) continue;
    const expiry = new Date(expiryStr);
    const daysLeft = Math.ceil((expiry.getTime() - Date.now()) / 86400000);
    if (daysLeft > 0 && daysLeft <= 14) {
      notifyUser({
        tenantId,
        userId: m.user_id,
        type: "deadline",
        severity: "warning",
        title: "ID06 håller på att gå ut",
        message: `Ditt ID06-kort går ut om ${daysLeft} dagar (${expiry.toLocaleDateString("sv-SE")}).`,
        link: "/settings/profile",
      }).catch(() => {});
    }
  }
}
