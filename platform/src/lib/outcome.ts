// Outcome flag — single source of truth for whether the campaign's
// specific ask has been resolved. Imported by Hero.astro and
// ActionForm.astro to swap their active-campaign UI for the
// resolved-state UI (parallel-actor framing: specific ask resolved,
// hand off ongoing structural work to Burnaby DPAC).
//
// Set to true on 2026-04-30 after SD41 Board's announcement that the
// Province has agreed to fund the full $9.4M arbitration cost
// (https://burnabyschools.ca/province-protects-districts-classrooms-and-budget-by-funding-arbitration-ruling/).
//
// Flip to false to restore the active-campaign hero + signup form
// (e.g. if the announcement is walked back). Two files use this flag.
export const OUTCOME_REACHED = true;

// Date of the SD41 Board announcement. Surfaced in kicker copy.
export const OUTCOME_DATE = '2026-04-30';

// Public URL of the SD41 Board's announcement. Used as the citation
// link in the hero outcome body and the scorecard outcome banner.
export const OUTCOME_SOURCE_URL =
  'https://burnabyschools.ca/province-protects-districts-classrooms-and-budget-by-funding-arbitration-ruling/';

// Burnaby DPAC's May 1 Day of Action page. Used as the hand-off link
// in the hero outcome body and the signup form's outcome notice
// ("if you want to keep showing up, that's a good place to start").
// Per parallel-actor framing: their work on chronic underfunding is
// distinct from but complementary to this campaign's specific ask.
export const DPAC_DAY_OF_ACTION_URL =
  'https://brantfordpac.com/2026/04/30/day-of-action-is-still-on/';
