# Skill: cost-estimation

<description>
Advanced methodologies for creating detailed project budgets, cost estimates (kalkyler), and analyzing profit margins.
</description>

## Cost Categories (Swedish Construction Standard)

1.  **Direkta kostnader (Direct Costs):**
    *   **Material:** Bricks, concrete, timber, etc. Include waste/spill factor (usually 5-10%).
    *   **Arbete (Labor):** Use standard hours/unit (from `time-calculation` skill) multiplied by the hourly rate.
    *   **Maskin/UE (Equipment/Subcontractors):** Direct rental costs and fixed-price subcontractor bids.

2.  **Indirekta kostnader (Indirect Costs / APD):**
    *   *Arbetsplatsdisposition (Site Setup):* Scaffolding, site huts (bodar), temporary electricity, waste management. Often calculated as a percentage of direct costs (10-15%) or detailed separately for larger projects.

3.  **Påslag (Markups):**
    *   **Centrala administration (Central Admin):** Overhead for the main office (typically 5-8%).
    *   **Risk & Vinst (Risk & Profit):** Desired profit margin plus buffer for unknowns (typically 5-15%).

## AI Agent Instructions

*   **Top-Down vs. Bottom-Up:** Use Top-Down (e.g., Kr/m2 based on historical data) for early-stage estimates. Use Bottom-Up (detailed line items) for final offers.
*   **Always state assumptions:** When providing an estimate, list the assumptions made (e.g., "Assumed 10% material waste", "Assumed no ground contamination").
*   **Formatting:** Present estimates in a clear table format, breaking down Direct Costs, Indirect Costs, and Markups separately before presenting the Grand Total.
*   **Currency:** Always default to SEK (Svenska Kronor) unless otherwise specified. Specify if the amount is exklusive moms (ex VAT) or inklusive moms (inc VAT). (B2B is almost always ex VAT).
