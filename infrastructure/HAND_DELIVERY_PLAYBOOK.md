# Hand-delivery Playbook

**Trigger:** confirmed signature count hits 500 (per `thresholds.yaml`). Visible on the homepage counter at https://fundburnabykids.ca.
**Owner:** Ben Zhou.
**Audience:** Ben + any future operator running the same play in a sequel campaign.

This is one document, three deliverables: (1) operations checklist, (2) cover letter template, (3) press release template. The day of delivery, scroll top-to-bottom; the templates further down get copy-pasted into their own files at the moment of use.

---

## Variables to fill before any deliverable goes out

| Variable | Where it comes from | Example |
|---|---|---|
| `{N}` | counter on the homepage of fundburnabykids.ca | `523` |
| `{DATE}` | today's date, formatted "Month DD, YYYY" | `May 12, 2026` |
| `{MLA_NAME}` | per-MLA in cover letter (Anne Kang / Rohini Arora / Raj Chouhan / Janet Routledge / Paul Choi) | `Anne Kang` |
| `{RIDING}` | per-MLA, full riding name | `Burnaby Centre` |
| `{N_RIDING}` | confirmed signatures from THIS MLA's riding (visible on `/mla/<id>/` page header) | `87` |
| `{ARBITRATION_DATE}` | date the BCPSEA arbitration ruling was issued | `2024-05-XX` (verify before using) |
| `{LOCAL_PRESS}` | media outlets contacted that day | `Burnaby Now, Tri-City News, CBC Vancouver, Global BC, Vancouver Sun` |

---

## 1. Operations checklist

### T-7 days (the week before delivery day)

- [ ] **Lock the date.** Pick a weekday with no major BC government news event. Avoid the day SD41 is hosting board meetings (they'll dominate local press that day). Aim for Tuesday or Wednesday — strongest news cycle for civic stories.
- [ ] **Email each of the 5 Burnaby MLA constituency offices.** Subject: `Burnaby parents — request for 15 min on [DATE] re: SD41 funding`. Body: short, neutral, names this campaign + the letter count, asks for a 15-min in-person handoff. If the office declines or doesn't reply within 3 days, plan to drop off at the front desk on the day — still legitimate.
- [ ] **Pre-arrange a route.** All 5 constituency offices are within Burnaby; a tight route is doable in one morning. Plot in Google Maps with appointment times.
- [ ] **Identify witnesses.** 2–3 PAC chairs or known coalition members willing to attend in person at one or more offices, ideally per riding (so the local PAC chair stands next to the local MLA's photo).
- [ ] **Identify a photographer.** A phone with a good camera + a person who isn't holding the letters. Each handoff = 1 photo.
- [ ] **Pre-pitch local press.** Email the local press list with a 1-paragraph "embargoed-until-[DATE]" advance: "On [DATE] more than {N} Burnaby parents will deliver letters to all 5 Burnaby MLAs asking the Province to fund the $9.4M SD41 arbitration from Budget 2026 Contingencies before May 27 budget adoption." Sign off with Ben's contact + the site URL.

### T-1 day (the day before)

- [ ] **Print stacks.** For each of the 5 MLAs:
  - Open `https://fundburnabykids.ca/mla/<id>/` (kang, arora, chouhan, routledge, choi)
  - Browser → Print → Save as PDF (the page has print stylesheet that strips chrome)
  - Print: 1 cover letter (filled with the MLA's name) on top + the riding's letters PDF below + 1 stapler
- [ ] **Print 2 extras** of the cover letter for Education Minister Lisa Beare + Finance Minister Brenda Bailey. They go out by **email** (not hand-delivery — they're in Victoria). Plus the aggregate letter PDFs and the press release attached.
- [ ] **Print the press release** on Burnaby Kids First letterhead (or just clean A4 with the brand title at the top).
- [ ] **Confirm photographer + witnesses** by text.
- [ ] **Reshare counter screenshot** to social: "{N} Burnaby parents have written. Tomorrow we deliver the letters." Drives last-minute signs.

### Day of delivery

- [ ] **Morning: re-pull each `/mla/<id>/` PDF.** New signers may have arrived overnight. If a riding's count changed materially (>5 new), reprint that stack.
- [ ] **Drive the route.** At each office:
  1. Hand the receptionist the cover letter + the riding's printed letter stack
  2. 30-second pitch: *"We're asking the Province to fund the $9.4M arbitration from Budget 2026 Contingencies before SD41 adopts on May 27. {N_RIDING} of your constituents have written. The full case is at fundburnabykids.ca."*
  3. Ask: *"Can MLA {MLA_NAME} respond in writing before May 27?"*
  4. Photograph the handoff (with the staffer's permission if they're visible — otherwise photograph the stack of letters in the office foyer)
  5. **Get the staffer's name and write it down.** Critical for follow-up.
- [ ] **After the last MLA, before lunch:** email press release + 5 photos to local press list. Subject: `[Hand delivery] {N} Burnaby parents asked the Province for $9.4M today`.
- [ ] **Same day, separately:** email Education Minister Lisa Beare (`ECC.Minister@gov.bc.ca`) + Finance Minister Brenda Bailey (`FIN.Minister@gov.bc.ca`) with the cover letter + the aggregate letter PDFs + the press release attached.
- [ ] **Social posts:** Tweet thread (3–5 tweets) + LinkedIn + WeChat-friendly post. Each ends with `https://fundburnabykids.ca`.

### T+1 day

- [ ] **Scan media.** Set up Google News alerts for "Burnaby SD41" + "$9.4M arbitration". If picked up, reshare and quote.
- [ ] **Update the MLA scorecard.** If any office acknowledged or committed during delivery, follow `infrastructure/MLA_REPLY_WORKFLOW.md` to update `mlas.yaml` + push.
- [ ] **Thank the witnesses + photographer + PAC chairs.** Personal email each.
- [ ] **PAC outreach.** Email PAC contacts list: "Delivered yesterday — here's the press release + photos, please share with your school community."

### Sources to keep open in tabs during delivery

- All 5 `/mla/<id>/` pages
- https://fundburnabykids.ca (the homepage with the live counter — let staffers see the number creep up)
- BCPSEA arbitration ruling primary-source URL
- BC Budget 2026 Contingencies Vote document URL
- This playbook itself (so you can re-read the 30-second pitch verbatim if you blank)

---

## 2. Cover letter template (per-MLA)

> Fill `{N}`, `{N_RIDING}`, `{DATE}`, `{MLA_NAME}`, `{RIDING}`. One copy per MLA — the riding count + name change. Also produce a generic version for the two ministers (drop `{N_RIDING}` and the riding-specific phrasing; keep the aggregate `{N}`).

```
{DATE}

{MLA_NAME}, MLA
{RIDING} Constituency Office

Re: {N_RIDING} letters from your constituents on the SD41 funding shortfall

Dear {MLA_NAME},

Attached are {N_RIDING} letters from parents in {RIDING} who are
asking the Province to fully fund the $9.4 million arbitration
liability facing Burnaby School District 41 from the $5 billion
Contingencies Vote in Budget 2026, before the district adopts its
2026-27 budget on May 27.

Each letter is from a confirmed Burnaby parent — we verified every
signature by email confirmation. Across all five Burnaby ridings
plus the two ministers, {N} parents have now written. The full
public list of co-signatories, and the primary-source documents
(BCPSEA arbitration ruling, Budget 2026 Contingencies Vote, SD41's
2025-26 budget cuts) are at https://fundburnabykids.ca.

We would welcome a written response on whether the Province will
fund the $9.4M from the Contingencies Vote. The deadline that
matters is May 27 — after the district adopts its budget, the cuts
become structural.

I am available to brief you or your staff on the source documents
directly, in person or by phone.

Sincerely,

Ben Zhou
Burnaby parent · founder, Burnaby Kids First
ben@fundburnabykids.ca
https://fundburnabykids.ca
```

### Minister variant (Beare / Bailey)

> Same body, different opening. Drop the riding clause; emphasize the aggregate.

```
{DATE}

The Honourable Lisa Beare
Minister of Education and Child Care
Province of British Columbia

Re: {N} parents in Burnaby asking the Province to fund the SD41 arbitration

Dear Minister Beare,

{N} parents in Burnaby School District 41 — across all five Burnaby
ridings — have now written, asking the Province to fully fund the
$9.4 million arbitration liability facing SD41 from the $5 billion
Contingencies Vote in Budget 2026, before the district adopts its
2026-27 budget on May 27.

[... rest as above ...]
```

---

## 3. Press release template (500-milestone)

> Use as the day-of media email. Subject: `[Hand delivery] {N} Burnaby parents asked the Province for $9.4M today`. Attach the 5 photos + the press release PDF.

```
FOR IMMEDIATE RELEASE
{DATE}

{N} Burnaby parents call on Province to fund $9.4M SD41 shortfall
before May 27 budget vote

BURNABY, BC — More than {N} Burnaby parents have signed an open
letter to the Province asking the BC government to fully fund a
$9.4 million arbitration liability facing Burnaby School District 41
(SD41) by drawing on the $5 billion Contingencies Vote already
allocated in Budget 2026.

The letters were delivered today to the constituency offices of
Burnaby's five MLAs — Anne Kang (Burnaby Centre), Rohini Arora
(Burnaby East), Raj Chouhan (Burnaby-New Westminster), Janet
Routledge (Burnaby North), and Paul Choi (Burnaby South-Metrotown)
— and emailed to Education Minister Lisa Beare and Finance Minister
Brenda Bailey.

The arbitration ruling stems from a 2022 collective-bargaining
error that BCPSEA has publicly acknowledged would have been fully
funded had it been correctly interpreted at the time. SD41 was not
a party to that negotiation but is now facing the cost.

"The funding mechanism exists in the Contingencies Vote," said Ben
Zhou, a Burnaby parent and founder of the Fund Burnaby Kids
campaign. "The application is the missing piece. $9.4 million is
0.19 per cent of the $5 billion already set aside for exactly this
kind of unforeseen collective-bargaining cost."

Last year, SD41 cut $4.2 million from its operating budget,
including counsellors, custodians, the Grade 7 band program
affecting 1,200 students, and advanced-learning programs.
Unrestricted reserves sit at roughly $4.3 million — less than half
the arbitration liability. A second year of cuts at this scale
would compound the structural damage.

The campaign asks for a written response from the Province before
SD41 adopts its 2026-27 budget on May 27, 2026.

The full case, the public list of confirmed signatories, and the
primary-source documents are at https://fundburnabykids.ca.

— END —

Media contact:
Ben Zhou
Burnaby parent · founder, Burnaby Kids First
ben@fundburnabykids.ca
https://fundburnabykids.ca

About Burnaby Kids First:
Burnaby Kids First is a parent-led, non-partisan coalition
advocating for Burnaby children on local school and education
issues. Fund Burnaby Kids is the coalition's first campaign.
```

---

## What NOT to include in any of the above

- No party attribution. Even when an MLA's party is well known, naming it in a cover letter or press release reads as partisan and gives the office a reason to discount the letter. Stick to riding name + MLA name.
- No personal attack on Ministers, MLAs, or BCPSEA. The campaign's authority comes from precision, not heat. The press release acknowledges "BCPSEA publicly acknowledged would have been fully funded" — that's the strongest line because it's their own admission, not our accusation.
- No claims about future cuts beyond what the SD41 board has explicitly tabled. The "$4.2M last year" line is fact; "$X next year" without a board document is speculation.
- No quotes from MLAs unless they're already in the public scorecard with a verifiable source (per `infrastructure/MLA_REPLY_WORKFLOW.md`).
- No contact info for individual signers. The cover letter and press release surface the aggregate count; the signers themselves are listed publicly only at fundburnabykids.ca with their consent (first name + last initial + school + neighbourhood — never email or postal).

---

## Trigger criteria for the next milestone (2,000)

When the homepage counter hits 2,000, the same playbook applies with two changes:

1. The press release lead changes from `{N} Burnaby parents call on...` to **"At 2,000 names, Burnaby's open letter on SD41 funding becomes a political object the Minister must respond to in writing"** — referencing the 2,000-name threshold from `thresholds.yaml`.
2. The Minister cover letter requests a written response **with a deadline** ("by May 20") rather than just "would welcome." 2,000 names is when polite framing yields to procedural demand.

Don't run the 2,000 play before hitting 2,000. Don't run it at 1,800.
