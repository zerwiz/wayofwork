---
name: logistics
description: Guidelines for managing heavy machinery, tool rentals, and material deliveries in Swedish construction projects
---

<description>
Guidelines for managing heavy machinery, tool rentals, and material deliveries in Swedish construction projects.
</description>

## Key Concepts & Terminology (Swedish)

- **Maskinhyra (Equipment Rental):** Often billed per day (dygnshyra) or per calendar day (kalenderdaghyra).
- **Transport / Etablering (Mobilization/Demobilization):** The cost of delivering and picking up heavy machinery. Often a significant fixed cost.
- **Drivmedel (Fuel):** Usually billed separately from the rental cost. Sometimes subject to index adjustments (Drivmedelstillägg).
- **Ledtid (Lead Time):** The time between ordering and delivery. Critical for avoiding delays on the critical path.
- **Lossning (Unloading):** Specify who is responsible for unloading (e.g., does the delivery truck have a crane (kranbil), or is a telehandler (teleskoplastare) needed on site?).
- **Vittes (Winter surcharge):** Additional costs during winter months for heating, snow removal, or special equipment.

## Workflow for Logistics Planning

1.  **Identify Need:** What equipment/material is needed, and for exactly what dates?
2.  **Check Availability:** Search internal inventory or calculate rental needs.
3.  **Cost Calculation:** Include rental rate * duration + mobilization + estimated fuel. Use the `project-pricing` skill.
4.  **Schedule Delivery:** Ensure site access and unloading capabilities are aligned with the delivery window.

## AI Agent Instructions
*   When a user asks for an equipment estimate, **always** remind them to include mobilization (etablering/avetablering) costs.
*   Ask clarifying questions about site access (e.g., "Kan en 24-meters lastbil vända på platsen?" / "Can a 24-meter truck turn around on site?").
*   Format logistics plans as Kanban tasks or scheduled calendar events.
