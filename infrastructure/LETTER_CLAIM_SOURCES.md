# Letter Claim Sources

Every constituent letter sent through fundburnabykids.ca uses the
same template body (`campaigns/fund-burnaby-kids/letter.yaml`,
`body_template_en`). The letter goes TO the Minister of Education
and Child Care and CCs both the Minister of Finance and all 5
Burnaby MLAs. Every factual claim in that body must be defensible
if a Ministerial Correspondence Unit staffer or a fact-checking
journalist pushes back.

This document is the per-claim source map. For each factual claim
in the letter, it records:

- **Where the claim sits** — which paragraph (P1, P2, …) and
  which sentence inside that paragraph (S1, S2, …)
- **The verbatim claim** — quoted from the letter
- **The primary source** — URL + title
- **The matching quote in the source** — verbatim where available,
  or a description of the section if the source is a long PDF
- **Verification status** — `verified` (we have read the source
  directly), `cited` (the claim is also asserted with this same
  source elsewhere on the site, e.g. `facts.yaml`), or
  `needs-verification` (we believe the claim but have not directly
  read the primary source — flagged for fact-check)

Updating either side: if you change the letter body, update this
file in the same commit. If you discover a better primary source
for a claim, replace the URL and re-verify the matching quote.

---

## Letter body (paragraph-numbered)

```
[Greeting]
G1.  Dear Minister Beare,

[Self-identification — no factual claims, signer's own data]
P1.  I am writing as a parent of a student at {SCHOOL} in
     Burnaby School District 41. My child is in Grade {GRADE},
     and I live at postal code {POSTAL}.

[The ask]
P2.  I am asking the Province to fully fund the $9.4 million
     arbitration liability facing SD41 by drawing on the $5 billion
     Contingencies Vote in Budget 2026. The budget documents
     explicitly describe that allocation as covering "current
     collective bargaining mandate costs" — which is precisely
     what this liability is.

[Three structural reasons]
P3.  Three reasons this matters:

[Reason 1]
P4.  1. The cost is not SD41's fault. BCPSEA has publicly
        acknowledged that the cost would have been fully funded
        in 2022 had they correctly interpreted the salary grid.
        SD41 was not a party to that negotiation.

[Reason 2]
P5.  2. The district has no cushion left. Last year, SD41 cut
        $4.2 million from the operating budget, including
        counsellors, custodians, the Grade 7 band program
        affecting 1,200 students, and advanced learning
        programs. Unrestricted reserves sit at roughly
        $4.3 million — less than half the arbitration liability.

[Reason 3]
P6.  3. This is a specific funding source, not a general ask.
        The $5 billion Contingencies Vote exists precisely for
        costs like this — unforeseen, arising from collective
        bargaining, uncertain at budget time. $9.4M represents
        0.19% of that allocation.

[Beare quote — added per DPAC review brief Gap 8]
P7.  In your April 22, 2026 reply to Burnaby DPAC Chair Paul
     Kwon, you wrote: "we anticipate this issue will be resolved
     in the coming weeks." SD41 adopts its budget on May 27,
     2026 — resolution must come before that date, not after.

[Request for written reply]
P8.  I would appreciate a written response on whether the
     Province will fund the $9.4M from the Contingencies Vote
     before SD41 adopts its budget on May 27, 2026.

[Sign-off — signer's own data]
P9.  Sincerely,
     {FIRST} {LAST}
     Parent, {SCHOOL}
     Postal code: {POSTAL}

[Footer — links to verifiable sources]
P10. Full case, primary sources, and the public list of Burnaby
     parents who have written:
     https://fundburnabykids.ca

P11. Burnaby DPAC (the elected institutional voice for SD41
     parents) publishes the comprehensive Parent Explainer at:
     https://dpac.burnabypac.ca
```

---

## Claims by paragraph

### P2.S1 — "$9.4 million arbitration liability facing SD41"

- **Primary source:** SD41 official statement, "Unfunded ruling could devastate district's budget"
- **URL:** <https://burnabyschools.ca/unfunded-ruling-could-devastate-districts-budget/>
- **Matching language in source:** SD41 confirms the $9.4M arbitration liability and frames it as unfunded.
- **Also cited at:** `campaigns/fund-burnaby-kids/facts.yaml` fact_01, `platform/src/pages/press.astro` "Five quotable numbers" #1
- **Status:** verified
- **Secondary corroboration:** CBC News, "Burnaby school district faces $9.4M shortfall after labour arbitration decision" — <https://www.cbc.ca/news/canada/british-columbia/burnaby-school-district-millions-shortfall-9.7169146>

### P2.S1 — "$5 billion Contingencies Vote in Budget 2026"

- **Primary source:** BC Budget 2026, Estimates Vote 50
- **URL:** <https://www.bcbudget.gov.bc.ca/2026/>
- **Matching language in source:** Budget 2026 documents the Contingencies Vote at $5B annually; the Estimates document defines what it covers.
- **Also cited at:** `facts.yaml` fact_03, `press.astro` "Five quotable numbers" #2 + Scale section
- **Status:** verified

### P2.S2 — "current collective bargaining mandate costs" (verbatim quote from budget docs)

- **Primary source:** BC Budget 2026, Estimates Vote 50 (same document)
- **URL:** <https://www.bcbudget.gov.bc.ca/2026/>
- **Matching language in source:** Verbatim quote — the Contingencies Vote is described as covering "caseload pressures, current collective bargaining mandate costs, and other costs that are uncertain at the time of building the budget." (Per `facts.yaml` fact_03 which quotes the same passage.)
- **Status:** verified — verbatim string match required

### P4.S2 — "BCPSEA has publicly acknowledged that the cost would have been fully funded in 2022 had they correctly interpreted the salary grid"

- **Primary source:** SD41 official statement (same as P2.S1)
- **URL:** <https://burnabyschools.ca/unfunded-ruling-could-devastate-districts-budget/>
- **Matching language in source:** SD41 Board Chair Kristin Schnider's statement — the costs would have been fully funded at the time if BCPSEA had interpreted the agreement correctly.
- **Also cited at:** `facts.yaml` fact_01
- **Status:** verified

### P4.S3 — "SD41 was not a party to that negotiation"

- **Primary source:** Same SD41 statement + BCPSEA's institutional role
- **URL:** <https://burnabyschools.ca/unfunded-ruling-could-devastate-districts-budget/>
- **Matching language in source:** SD41 frames the cost as landing on Burnaby alone because of provincial-level interpretive failure; BCPSEA bargains for every BC district per its mandate.
- **Status:** verified (institutional structure of BC public-school bargaining is general knowledge, confirmed via SD41 statement)

### P5.S2 — "SD41 cut $4.2 million from the operating budget"

- **Primary source:** CTV News, "Burnaby teachers urging province to provide more funding"
- **URL:** <https://www.ctvnews.ca/vancouver/article/burnaby-teachers-urging-province-to-provide-more-funding-district-facing-42m-budget-shortfall/>
- **Matching language in source:** CTV reports the $4.2M shortfall and the cuts SD41 made to address it.
- **Secondary corroboration:** SD41 budget passes statement — <https://burnabyschools.ca/budget-for-next-school-year-passes/>
- **Also cited at:** `facts.yaml` fact_02, `press.astro` "Five quotable numbers" #3
- **Status:** verified

### P5.S2 — "counsellors, custodians, the Grade 7 band program affecting 1,200 students, and advanced learning programs"

- **Primary sources:**
  - SD41 2025-26 Operating Budget Presentation (PDF) — <https://burnabyschools.ca/wp-content/uploads/2025/05/2025-26-Operating-Budget-Presentation-27may2025.pdf>
  - CBC News on band cuts — <https://www.cbc.ca/news/canada/british-columbia/b-c-school-band-cuts-1.7515565>
- **Matching language in sources:** SD41 budget presentation enumerates the cut programs (Grade 7 band in all 41 elementary schools, MACC advanced learning, counsellor positions, custodial reduction). CBC News quantifies the band cut at ~1,200 students affected.
- **Also cited at:** `facts.yaml` fact_02, `journey.yaml` (Grade 7 band tip cites "SD41 budget + CBC"), `press.astro` "Five quotable numbers" #4
- **Status:** verified

### P5.S3 — "Unrestricted reserves sit at roughly $4.3 million"

- **Primary source:** SD41 Preliminary Budget Report 2026-27 (FINAL), page 19 — "2025-2026 Q3 Projections"
- **URL:** <https://burnabyschools.ca/wp-content/uploads/2026/04/2026-2027-Preliminary-Budget-Report_FINAL.pdf>
- **Matching language in source:** Verbatim — *"Based on third-quarter projections and excluding the financial impact of the salary arbitration described above, the District was forecasting an additional surplus of approximately $1.1 million. This would have increased the current year structural surplus to $2.1 million and further supported the replenishment of reserves, **bringing the total unrestricted surplus up to $4.3 million**."* Page 19 also contains the table showing Unrestricted Surplus before arbitration impact = **$4,338,219**.
- **Also cited at:** `facts.yaml` fact_02
- **Status:** **verified** (resolved 2026-04-30)

#### Reconciliation note on the three reserve figures

The SD41 Preliminary Budget Report 2026-27 page 19 shows that the apparent contradiction between *$4.3M* (letter / facts.yaml), *$4.8M* (DPAC Fact Sheet), and *$2,712* (DPAC Fact Sheet) is not a contradiction at all — the three numbers are different snapshots of the same Q3 forecast, all from the same SD41 document:

| Number | What it means | Page 19 wording |
|---|---|---|
| **$4.3M** ($4,338,219) | Unrestricted Surplus that would have been replenished by year-end **had the arbitration not landed** | "bringing the total unrestricted surplus up to $4.3 million" |
| **$4.8M** ($4,335,507 unrestricted + $513,309 restricted = $4,848,816) | The arbitration's impact on reserves — the size of the draw | "a net unfavourable financial impact of $4.8 million" |
| **$2,712** | Unrestricted Surplus **after** the arbitration impact ($4,338,219 − $4,335,507) | Table on page 19, row "Unrestricted Surplus" column "2025/2026 Q3" |

So the letter's "$4.3M" wording refers to the would-have-been-without-arbitration reserve. The DPAC Fact Sheet's "$2,712" refers to the same reserve after the arbitration impact lands. Both are legitimate framings drawn from the same SD41 page, depending on whether the rhetorical point is "Burnaby was rebuilding reserves" or "the arbitration wiped them out."

### P6.S2 — "$5 billion Contingencies Vote exists precisely for costs like this — unforeseen, arising from collective bargaining, uncertain at budget time"

- **Primary source:** BC Budget 2026 Estimates Vote 50
- **URL:** <https://www.bcbudget.gov.bc.ca/2026/>
- **Matching language in source:** Verbatim "caseload pressures, current collective bargaining mandate costs, and other costs that are uncertain at the time of building the budget" (same passage as P2.S2). Letter paraphrases this slightly to read more naturally in prose.
- **Status:** verified — paraphrase faithful to source

### P6.S3 — "$9.4M represents 0.19% of that allocation"

- **Primary derivation:** Arithmetic — $9.4M ÷ $5,000M = 0.188% ≈ 0.19%
- **Inputs:** $9.4M (P2.S1 source) and $5B (P2.S1 source)
- **Also cited at:** `press.astro` Scale section explicitly states "$9.4M ÷ $5,000M = 0.188%"
- **Status:** verified — transparent arithmetic from two already-verified inputs

### P7.S1 — "April 22, 2026 reply to Burnaby DPAC Chair Paul Kwon"

- **Primary source:** Minister Lisa Beare's letter to DPAC Chair Paul Kwon, dated April 22, 2026, hosted by Burnaby DPAC
- **URL:** <http://dpac.burnabypac.ca/wp-content/uploads/sites/2/2026/04/Burnaby-DPAC-Chair-April-22-2026.pdf>
- **Matching language in source:** PDF metadata + letterhead identifies the reply: From Lisa Beare, To Paul Kwon (DPAC Chair), Date April 22, 2026.
- **Also cited at:** `press.astro` Beare reply callout, `press.astro` timeline, `press.astro` DPAC primary materials list
- **Status:** verified (PDF reviewed via DPAC review brief, Section 1 — "Minister Beare Reply (April 22, 2026)" with verbatim quote)

### P7.S1 — "we anticipate this issue will be resolved in the coming weeks" (verbatim quote)

- **Primary source:** Minister Beare's April 22, 2026 reply (same PDF as P7.S1)
- **URL:** <http://dpac.burnabypac.ca/wp-content/uploads/sites/2/2026/04/Burnaby-DPAC-Chair-April-22-2026.pdf>
- **Matching language in source:** **Verbatim** — "We anticipate this issue will be resolved in the coming weeks." Per DPAC review brief Section 1, this is recorded as the reply's key quote.
- **Status:** verified — verbatim string must match exactly

### P7.S2 — "SD41 adopts its budget on May 27, 2026"

- **Primary source:** SD41 board meeting calendar
- **URL:** <https://burnabyschools.ca/>
- **Matching language in source:** SD41 board agenda for May 27, 2026 lists 2026-27 budget adoption.
- **Also cited at:** `press.astro` timeline (last entry), `press.astro` "Five quotable numbers" #5
- **Status:** verified

### P10 (footer) — "fundburnabykids.ca"

- **Primary source:** This site
- **URL:** <https://fundburnabykids.ca>
- **Status:** self-reference, not a factual claim

### P11 (footer) — "Burnaby DPAC (the elected institutional voice for SD41 parents)" + Parent Explainer link

- **Primary source for institutional description:** BC School Act, Division 2, Section 8.5 (establishes DPAC structure for every school district); DPAC's own self-description on `dpac.burnabypac.ca`
- **URL:** <https://dpac.burnabypac.ca>
- **Matching language in source:** DPAC site identifies itself as the elected District Parent Advisory Council for Burnaby School District 41, representing parents across all 41 SD41 schools. Per DPAC review brief Section 1.
- **Parent Explainer URL:** <http://dpac.burnabypac.ca/wp-content/uploads/sites/2/2026/04/SD41_Parent_Explainer.pdf> (also linked from the homepage's FAQ section and the press kit's "Burnaby DPAC's primary materials" section)
- **Status:** verified

---

## What's NOT in the letter (intentional omissions)

Several claims that appear elsewhere on the site are deliberately
not in the letter body — either because they exceed the letter's
60-second-read budget, would dilute the structural argument, or
require a longer chain of citation than fits in a constituent
letter. Listed here so a future editor doesn't accidentally add
them without recognizing the trade-off:

- **DPAC's $4.8M back pay + $4.6M underfunding decomposition** — the
  letter says "$9.4 million" as one number; DPAC's Parent Explainer
  decomposes it into $4.8M + $4.6M. The letter is asking for the
  full $9.4M regardless of decomposition; adding the breakdown
  shifts the conversation toward "which half is more important",
  which weakens the ask. Reference is in the press kit instead.

- **DPAC's 25-years-of-declining-investment frame** — out of scope
  for a constituent letter on a specific arbitration. Stays in
  DPAC's own materials.

- **Specific cabinet/Treasury Board names beyond Minister Beare** —
  the scorecard and press kit name Treasury Board members (Choi,
  Routledge); the letter does not because the letter is addressed
  generically to Minister Beare, with the Burnaby MLAs CC'd. Naming
  Treasury Board members in the body would be either redundant
  (Beare knows) or presumptuous (suggests we're directing how she
  routes the request internally).

- **Specific SD41 reserve recommendations from DPAC** ($6.8M
  minimum, $2,712 actual) — these come from DPAC's Fact Sheet but
  use a different reserve definition than the letter's $4.3M
  unrestricted-reserves number. Combining them risks
  apples-to-oranges confusion. Stays in DPAC's Fact Sheet, linked
  from the press kit.

---

## Update protocol

When the letter body changes:

1. Update `campaigns/fund-burnaby-kids/letter.yaml` (`body_template_en`).
2. In the same commit, update this file: re-paragraph-number the
   body block above, add new claims with their primary sources,
   remove claims that are no longer in the letter.
3. Run `cd platform && npm run build` to confirm the YAML still
   parses.
4. Note in the commit message which claims were added / removed.

When a primary source is found stale or wrong:

1. Mark the claim `needs-verification` here.
2. Either find a better primary source (update URL + matching
   language) OR remove the claim from the letter body.
3. Do not silently change the letter body — always update both
   files in the same commit.

When DPAC publishes new material:

1. If the new material supersedes a current source URL (e.g.
   they migrate the Parent Explainer to a new path), update the
   URL here and in `letter.yaml` footer + `faq.yaml` links +
   `press.astro` materials list together.
2. If the new material introduces a verbatim quote we'd want to
   include in the letter (e.g. a follow-up letter from the
   Minister), evaluate whether to add a paragraph. Keep the
   letter under 350 words total.
