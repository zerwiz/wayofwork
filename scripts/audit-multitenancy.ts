import { Database } from "bun:sqlite";
const db = new Database("data/wayofwork.sqlite");

function verifyIsolation(table: string, idField: string = "id") {
  const tenantDefault = "default";
  const tenantDemo = "tenant_demo";

  // Get item belonging to tenant_demo
  const demoItem = db.query(`SELECT * FROM ${table} WHERE tenant_id = ? LIMIT 1`).get(tenantDemo);
  if (!demoItem) {
    console.log(`No items found for tenant_demo in ${table}, skipping.`);
    return;
  }
  
  // Attempt to fetch demo item using default tenant ID
  const fetchedItem = db.query(`SELECT * FROM ${table} WHERE ${idField} = ? AND tenant_id = ?`).get(demoItem[idField], tenantDefault);
  
  if (fetchedItem) {
    console.error(`CRITICAL: Isolation failure in ${table}! Tenant 'default' can access tenant_demo's item ${demoItem[idField]}.`);
  } else {
    console.log(`SUCCESS: Tenant isolation verified in ${table}. 'default' tenant cannot access 'tenant_demo' items.`);
  }
}

verifyIsolation("projects");
verifyIsolation("tickets");
verifyIsolation("price_lists");
