# L&D Module — Addendum: Progress Tracker, Ranking & Org/Dept/Team Views

**Companion to:** `LnD_Module_BRD_FRD.docx` (v1.0, 19 June 2026)
**Status:** Draft for review — not yet approved, not yet built. Build phasing resolved (Section 4.5) — ready for sprint planning once reviewed.
**Scope of this addendum:** Section 4 (Learner Consumption Flow), Section 6 (Manager Oversight Flow), and Section 5 (Functional Requirements) of the parent BRD are extended here with three concrete feature specs: progress tracking UX, ranking/leaderboard system, and org/department/team rollup dashboards — each one explicitly mapped into the parent BRD's existing Phase 1/1.5/2/3 build sequence (Section 4.5), not a separate phase track. This addendum does not replace the parent document — it adds detail the parent intentionally left at a high level.

---

## 0. Why this addendum exists

The parent BRD specifies *that* progress must be tracked (FR-4.1–4.4) and *that* reports must roll up by team/department/org (FR-6.1–6.2), but doesn't specify the actual UX/interaction patterns. This addendum closes that gap, grounded in how comparable platforms actually implement these three features — corporate LMS tools (Workday Learning, Cornerstone OnDemand, Docebo, SAP SuccessFactors Learning) and consumer ed-tech (PhysicsWallah, Unacademy, Coursera, Udemy) — so we build from validated patterns, not assumptions.

---

## 1. Progress Tracker

### 1.1 Pattern reference

Near-universal across every platform researched: a **% complete bar + "Resume where you left off"** affordance. Coursera reports this pattern alone measurably improves completion rates. This is the safe, validated default — no platform skips it.

### 1.2 Functional spec

| Element | Behavior |
|---|---|
| **Course-level progress bar** | Shown on every course card (catalog, My Learning, manager view). `% complete = (modules meeting their own completion rule) / (total required modules)`, per FR-2.6's configurable completion criteria. |
| **Module-by-module checklist** | Inside a course, each module shows a status icon: Not Started / In Progress / Completed. Locked modules (sequential mode, FR-2.5) show a lock icon instead of a checkbox. |
| **Resume button** | "Continue" CTA on any in-progress course jumps directly to the learner's last position — last video timestamp, last document page, or first incomplete module in sequential courses. Reuses FR-4.1 (resume-from-last-position). |
| **Time-spent indicator** | Shown to the learner on their own transcript (FR-6.3) and to admins on the org dashboard (FR-6.1) — aggregate time spent per course/learner, not just completion %. Sourced from the same heartbeat events used for video progress (FR-4.3). |
| **Streak / cadence tracking** | **Not included in Phase 1.** No corporate LMS researched (Workday, Cornerstone, Docebo, SAP) implements streaks natively — it's a consumer-app pattern (Duolingo-style) with no enterprise precedent found. Revisit only if Phase 2 gamification (already out-of-scope per parent BRD §1.2) is approved. |

### 1.3 New/extended Functional Requirements

- **FR-4.6 (new):** Course-level progress bar must be computed live from underlying module/quiz completion state — not a separately-stored, independently-updatable field — to avoid drift between displayed % and actual completion state.
- **FR-4.7 (new):** "Continue" / Resume CTA on My Learning and course detail pages, resolving to last-viewed position per FR-4.1.
- **FR-6.6 (new):** Time-spent-per-course metric surfaced on both learner transcript (FR-6.3) and admin/manager dashboards (FR-6.1/6.2), sourced from existing ProgressLog heartbeat events — no new tracking mechanism needed.

---

## 2. Ranking / Leaderboard

### 2.1 Pattern reference and decision

Research surfaced a real split: Indian consumer ed-tech (PhysicsWallah, Unacademy) treats percentile/rank as a core, always-on feature post-quiz. Enterprise LMS is split — Workday Learning has **zero** competitive layer (status-only: Completed/Open/Overdue), while Docebo has the richest implementation (badges → points → leaderboards, **with an anonymous mode** where a learner sees their own rank but not others' names) and SAP SuccessFactors frames gamification as a compliance-engagement tool rather than pure competition.

**Decision for this build: optional, admin-configurable per course — default OFF.** This mirrors Docebo's model rather than PW's always-on model, since this is a B2B/internal corporate tool, not a consumer exam-prep product. Admin opts a specific course or learning path into ranking; it is never forced org-wide.

### 2.2 Functional spec

| Element | Behavior |
|---|---|
| **Ranking toggle** | Per-course setting (alongside existing course metadata, FR-2.1): `enableRanking: boolean`, default `false`. Only Admin can toggle (same permission tier as course authoring, Section 3.1 of parent doc). |
| **Ranking scope** | When enabled, ranking is computed within a defined population — same department, same auto-assignment cohort, or org-wide (Admin choice per course, not learner choice). |
| **Ranking basis** | Quiz score (primary), with **time-taken as tie-breaker** — mirrors Unacademy's accuracy+time model so ties resolve deterministically rather than arbitrarily. |
| **Anonymous mode** | Default ON when ranking is enabled: learner sees their own rank/percentile (e.g. "Top 15%") but not other learners' names or scores. Admin can disable anonymity per course if the org explicitly wants a named leaderboard (e.g. for an internal hackathon-style optional course) — this must be an explicit, logged decision, not a silent default. |
| **Manager/Admin visibility** | Managers and Admins can always see named, full rankings within their scope (their team / org-wide respectively) regardless of the learner-facing anonymity setting — this is a reporting view, not a competitive display, and follows the same permission tier as existing FR-6.1/6.2 dashboards. |
| **No ranking on mandatory/compliance courses** | Ranking toggle is **disabled by design** (not just default-off, actually unavailable) for any course flagged Mandatory (per parent BRD's enrollment mode in Section 4.1) — compliance training should never feel competitive or punitive; this matches Workday's pure-compliance, status-only approach for that category specifically. |
| **Minimum cohort size for ranking** | Ranking does not activate until the enrolled+attempted population for that course/scope reaches a configurable minimum (recommend default: 8). Below that threshold, percentile/rank is statistically meaningless and — even in anonymous mode — a rank like "2nd of 3" can de-anonymize the learner by elimination. Below the minimum, the learner sees their score only, no rank/percentile. |

### 2.3 New Functional Requirements

- **FR-4.8 (new):** Optional per-course ranking, computed from `QuizAttempt` records (score desc, time-taken asc as tie-breaker), scoped to a configurable population (department / cohort / org-wide).
- **FR-4.9 (new):** Anonymous-mode toggle per course, default true when ranking is enabled. Learner-facing rank display never includes other learners' identities when anonymous mode is active.
- **FR-4.10 (new):** Ranking toggle is unavailable (not just unchecked) on any course where `mandatory = true`. Enforced at the API layer, not just hidden in the UI.
- **FR-4.11 (new):** Ranking/percentile is suppressed (score-only shown to the learner) until the scoped population's attempt count reaches a configurable minimum, default 8.
- **FR-6.7 (new):** Manager/Admin reporting views always show full named rankings within their permitted scope (their team / org), independent of learner-facing anonymity settings.

---

## 3. Org / Department / Team Rollup Views

### 3.1 Pattern reference

Consistent two-tier structure across every enterprise platform researched (Workday, SAP SuccessFactors, Cornerstone): a **manager-scoped view** (direct reports only) and an **admin/org-wide view** (cross-department, with drill-down filters). Critically, "who's behind" is treated as an **actionable** UI element everywhere, not a passive report — managers can send reminders directly from the dashboard, not just view a number.

### 3.2 Functional spec

**Manager view ("My Team"):**
- Scoped strictly to the manager's direct + indirect reports (reuses the existing Employee hierarchy / reporting-manager structure already in the HR app — per parent BRD's integration principle, FR-7.1, do not duplicate org data).
- Per-person status: Completed / In Progress / Not Started / Overdue, for each assigned course.
- Overdue items visually flagged (red, per parent BRD Section 4.2.4 "overdue mandatory trainings highlighted").
- **One-click nudge**: manager can send a reminder notification to a specific report directly from this view, individually or in bulk — extends the parent BRD's existing "manual nudge" capability (Section 4.2.4) with a from-the-dashboard action rather than a separate flow.
- Pending nomination approvals surfaced here too (already specified in parent BRD FR-3.4).

**Admin / org-wide view:**
- Drill-down hierarchy: **Org → Department → Team → Individual**, matching the dominant enterprise pattern (explicit in Cornerstone, implicit in Workday's split structure).
- Filterable by department, location, role, course category, and date range.
- Completion-rate trend over time (already specified in parent BRD FR-6.1) — this addendum specifies the **drill-down interaction model**: clicking a department's completion % expands to that department's teams, clicking a team expands to individuals, rather than requiring separate report pages per level.
- Cross-department comparison view (e.g. bar chart of completion % by department) for identifying systemic gaps, not just individual stragglers.

### 3.3 New Functional Requirements

- **FR-6.8 (new):** Manager "My Team" dashboard includes one-click reminder/nudge action per overdue learner (individual or bulk-select), in addition to the automated reminder cadence already specified in parent BRD Section 8 (Notification & Escalation Matrix).
- **FR-6.9 (new):** Admin dashboard implements a single drill-down interaction (Org → Department → Team → Individual) rather than separate static reports per level — each level's completion % is clickable to expand into the next level down.
- **FR-6.10 (new):** Cross-department comparison visualization (completion % side-by-side by department) on the admin dashboard, for identifying systemic gaps vs individual non-compliance.

---

## 4. Open Questions for Stakeholder Review

Before implementation, the following need an explicit decision (flagging now so they don't surface mid-sprint, consistent with the parent document's stated goal of "no clarification round-trip needed before sprint planning"):

1. **Ranking population default** — when Admin enables ranking on a course, what's the *default* scope (department / cohort / org-wide) before Admin overrides it? Recommend department-level default, since org-wide-by-default on a large multi-department org risks feeling impersonal or demotivating for smaller departments.
2. **Anonymous-mode override audit** — confirmed in Section 2.2 that disabling anonymity must be "explicit and logged," but should disabling it on an already-published course require re-confirmation from learners already enrolled (since they may have started under the assumption of anonymity)? Recommend: no retroactive change — anonymity setting locks once the course is published, only adjustable on a new version (consistent with parent BRD's existing versioning behavior, Section 4.3.1/FR-2.4).
3. **Combined notification cap** — Section 8 of the parent BRD already stacks T-7/T-3/T-1 reminders + recurring overdue notices + manager escalation; this addendum adds manager-initiated one-click nudges (FR-6.8) on top of that. Recommend a single cross-cutting cap — e.g. max N training-related notifications per learner per day across *all* sources combined (automated + manual) — rather than rate-limiting manager nudges in isolation, since the fatigue risk is cumulative, not source-specific. **New FR-8.1:** notification dispatch engine enforces one combined per-learner daily cap across all L&D notification types, not a per-trigger-type cap.

---

## 4.5 Build Phasing — Where These Features Slot Into the Parent BRD's Sequence

The parent BRD's Section 9.3 already defines the L&D module's overall build sequence (Phase 1 MVP → 1.5 → 2 → 3). The features in this addendum are not a separate track — each one slots into that existing sequence. Mapped explicitly below so sprint planning works off one phase structure, not two:

| Addendum feature | Parent BRD phase | Why |
|---|---|---|
| Progress bar, module checklist, resume CTA (FR-4.6, FR-4.7) | **Phase 1 (MVP)** | Directly extends FR-4.1–4.4, which the parent already scopes to Phase 1. No new infrastructure — purely a read/compute layer over data Phase 1 already tracks. |
| Time-spent metric on transcript/dashboard (FR-6.6) | **Phase 1 (MVP)** | Same ProgressLog heartbeat events Phase 1 already records (FR-4.3); this is a display requirement, not a new tracking mechanism. |
| Manager "My Team" view + one-click nudge (FR-6.8) | **Phase 1 (MVP)** | Parent's Phase 1 already includes "FR-6 (basic dashboards)" and Section 4.2.4's manual nudge capability — this only adds the dashboard-embedded action button. |
| Admin org→dept→team drill-down + cross-dept comparison (FR-6.9, FR-6.10) | **Phase 1 (MVP)**, refined in **Phase 2** | Basic rollup belongs in Phase 1 (parent's "FR-6 basic dashboards"); the richer drill-down *interaction* (click-to-expand) and comparison chart can ship as a Phase 1 fast-follow or Phase 2 polish item if Phase 1 timeline is tight — does not block other Phase 1 work. |
| Combined notification cap (FR-8.1) | **Phase 1 (MVP)** | Must exist before Phase 1 launches — without it, Phase 1's own notification matrix (parent Section 8) already risks fatigue on day one. This is a guardrail on existing Phase 1 scope, not new scope. |
| **Ranking / leaderboard (FR-4.8–4.11, FR-6.7)** | **Phase 2** | The parent BRD explicitly scopes "Gamification (badges, leaderboards)" to Phase 2 (Section 1.2). Ranking is gamification by the parent's own definition — it must not be pulled into Phase 1 MVP, regardless of how it's configured (anonymous/optional doesn't change its phase). Building this in Phase 1 would contradict the parent doc's own scope boundary. |

**Net effect:** everything in this addendum ships in **Phase 1** *except* ranking/leaderboard, which ships in **Phase 2** alongside the parent's other gamification-adjacent items, once SCORM/versioning/auto-assignment (Phase 1.5) are also in place. This keeps Phase 1 MVP scope exactly as tight as the parent BRD intended, while still capturing the ranking design now so it doesn't need re-deriving later.

---

## 5. Confirmed Out of Scope / Not Applicable

The following were raised during BA review and explicitly resolved by the business owner — recorded here so they aren't re-raised later as open questions:

- **Data migration:** Not applicable. This is the organization's first L&D system — there is no prior LMS, spreadsheet tracker, or manually-issued certificate history to migrate. All learner records start fresh at launch.
- **Infrastructure/storage costing:** Deferred. Architecture decisions in the parent BRD (S3, CloudFront, SCORM runtime) stand as-is; sizing and cost modeling is explicitly not required at this stage and should not block Phase 1 estimation.
- **Mobile/offline access for non-desk workers:** Not applicable. Confirmed the workforce is desk-based with reliable browser access during work hours — the parent BRD's "responsive web only, no native app" scope (Section 1.2) is sufficient as-is, no shop-floor/kiosk accommodation needed.

## 6. Still Worth a Decision Before Launch (policy, not engineering)

These don't block sprint planning or estimation, but should have an answer from HR/L&D ownership before go-live, since they shape data handled by the system rather than how it's built:

- **Retention period for training/certificate records** — the parent BRD already specifies *not* to cascade-delete a departed employee's history (Section 7.2), but doesn't state how long that history is retained post-departure. Needs an answer from HR/compliance, not engineering — recommend confirming alongside whatever retention period already governs other HR records in this system, for consistency.
- **Success metric for the module** — the parent BRD specifies what to build but not what it's meant to move (completion %, time-to-train, compliance rate, etc.). Not a launch blocker, but worth defining before Phase 1 ships so there's a basis for evaluating whether it worked and what Phase 1.5/2 should prioritize next.

---

*This addendum should be reviewed alongside the parent BRD before sprint estimation. No implementation has started — this is a planning document only.*
