# L&D Module — Build Plan (Codebase-Realistic Phasing)

**Companion to:** `LnD_Module_BRD_FRD.docx` (v1.0) and `LnD_Progress_Ranking_OrgViews_ADDENDUM.md`
**Status:** Approved scope decisions below — ready to start Phase 1 implementation.
**Purpose:** The parent BRD's Phase 1 (Section 9.3) assumes infrastructure that doesn't exist yet in this codebase (S3, job scheduler, dynamic RBAC, PDF library). This document re-sequences the BRD's functional requirements against what's actually buildable today in `d:\HR_Project`, so Phase 1 ships on real infrastructure instead of idealized infrastructure.

---

## RESUME HERE

**Status as of 2026-06-24:** Phase 1 is fully done. **Phase 1.5 is fully closed** (SCORM/xAPI remains the one deliberately-deferred item, not part of committed scope). **Phase 2 is FULLY CLOSED** — all six items from Section 4 are shipped: ranking/leaderboard, learning paths, admin dashboard drill-down, nomination/approval, ILT scheduling/capacity/attendance + calendar view, and Performance Management integration. Phase 3 (Section 5) remains explicitly out of scope per the parent BRD.

**Beyond the original BRD scope:** the user directly requested a **quiz grading + badge system** (admin/manager-configurable grade tiers per quiz, beyond pass/fail, plus a Coursera/LinkedIn-Learning-style badge gallery earned from quiz grades and completion milestones). This is now built and is documented in its own section below since it wasn't part of the BRD's six Phase 2 items.

### Grading bands + badges (built 2026-06-24, not BRD-sourced)

- **Schema**: `GradeBand` (per-quiz, admin-configurable label + minScore tiers, e.g. "Excellent" at 90%), `QuizAttempt.gradeLabel` (snapshotted at grading time — editing/deleting grade bands later doesn't retroactively change a learner's already-recorded grade), `Badge` (catalog: name/description/iconKey/criteriaType/criteriaValue/criteriaLabel), `EmployeeBadge` (earned record, optionally tied to the triggering `QuizAttempt`).
- **Backend**: `POST /learning/modules/:id/quiz` extended to accept `gradeBands` (validated for distinct minScores); the quiz-attempt endpoint computes `gradeLabel` via `resolveGradeLabel()` (highest qualifying band) and calls `evaluateAttemptBadges()`. New `server/src/utils/badgeService.ts` — `evaluateAttemptBadges` (QUIZ_GRADE/PERFECT_SCORE, deduped via the `(employeeId, badgeId, sourceQuizAttemptId)` unique constraint), `evaluateCourseCompletionBadges`/`evaluatePathCompletionBadges` (milestone counts, deduped via explicit existence check since SQL NULL doesn't participate in unique constraints — wired into `evaluateCourseCompletion`/`evaluatePathProgress`). New dedicated router `server/src/routes/badges.ts` mounted at `/api/badges` — catalog list (HR create/delete), `GET /badges/employees/:employeeId` (earned badges, permission-checked via `assertCanAccessEmployee`). New `BADGE_EARNED` notification type.
- **Frontend**: `QuizBuilder.tsx` got a "Grade tiers" toggle + tier editor (defaults to Excellent/Good/Satisfactory at 90/75/60); `QuizPlayer.tsx` shows the earned grade label on the result screen. New `BadgeComposer.tsx` (HR: name/description/icon/criteria), `BadgeCatalogPanel.tsx` (browse + HR manage, new "Badges" sub-tab in `Dashboard.tsx`'s `LearningPage`), `BadgeGallery.tsx` (earned-badges grid, embedded in `PerformanceTab.tsx`'s existing "Learning" sub-tab). Icon rendering uses a curated explicit map (`utils/badgeIcons.ts`) rather than a `import * as Icons from 'lucide-react'` wildcard — the wildcard version was caught in review since it pulled the entire icon library into the bundle (+700KB), undoing tree-shaking; fixed before it shipped.
- Both frontend and backend typecheck/build clean as of this change.

What's confirmed built — Phase 1 (complete):
- **Schema**: `Course`, `CourseModule`, `Quiz`, `QuizQuestion`, `QuizOption`, `QuizAttempt`, `Enrollment` (incl. `assignedById`, `dueDate`), `ModuleProgress`, `Certificate`.
- **Backend** (`server/src/routes/learning.ts`): course CRUD + publish/unpublish, module CRUD, quiz creation + attempt/grading, self-enroll, manual assignment (`POST /courses/:id/assign`), progress heartbeat, certificate download + verify, `GET /learning/team/enrollments`, `GET /learning/admin/department-summary`.
- **Certificate generation**: `server/src/utils/certificateGenerator.ts` (pdf-lib).
- **Frontend**: `LearningCatalogPanel.tsx`, `CourseDetailView.tsx` (heartbeat progress, video resume, sequential locking, quiz player, certificate download — verified end-to-end), `CourseComposer.tsx`, `AssignCourseDialog.tsx`, `MyLearningPanel.tsx`, `TeamLearningPanel.tsx`, `AdminLearningDashboard.tsx`.
- **Dashboard wiring**: `Learning` sidebar tab → `LearningPage` wrapper with sub-tabs (Catalog / My Learning / Team / Overview).

What's confirmed built — Phase 1.5 (complete):
- **Due-date reminders**: `Enrollment.lastReminderDay` tracks the last milestone sent. `learningReminderScheduler.ts` (6-hour poll, no `node-cron` — reused the existing `setInterval` pattern from `announcementScheduler.ts`) sends T-7/T-3/T-1/due-today reminders (in-app + email); escalates to learner + manager(s) + HR on overdue day 1, then weekly. `sendLearningReminderEmail` in `mailer.ts`.
- **Manager nudge button + notification cap**: `POST /learning/enrollments/:id/nudge`, scoped via `getScopedEmployeeIds`, capped at one learning notification/learner/day via `hasReceivedLearningNotificationToday` (shared with the scheduler), 429 via `TooManyRequestsError` when capped. `TeamLearningPanel.tsx` has the per-row Nudge button.
- **Rule-based auto-assignment**: `Course.autoAssign` + `autoAssignDueDays` (no separate rules table — the course carries its own matching criteria via `mandatory`/`targetDepartment`). `learningAutoAssignScheduler.ts` (6-hour poll) enrolls every matching active employee, including ones onboarded/transferred in later. `CourseComposer.tsx` toggle + due-days field; "Auto-Assign" badge on catalog cards.
- **Certificate expiry/renewal**: `Course.certificateValidityMonths`, `Certificate.expiresAt`/`lastExpiryReminderDay`. `certificateExpiryScheduler.ts` (6-hour poll) sends T-30/T-7/expired reminders, escalating to manager+HR on actual expiry. New `POST /learning/enrollments/:id/renew` resets a learner's own completed enrollment for a retake. `CourseComposer.tsx` toggle + validity-months field; `MyLearningPanel.tsx` shows an expired badge + Renew button.
- **Course versioning (guard-rail version, not full multi-version history)**: `DELETE /modules/:id` and `POST /modules/:id/quiz` (quiz replace) both now block the action if any learner has progress/attempts, unless `?force=true` is passed — surfaces the affected-learner count in the error. `CourseComposer.tsx`/`QuizBuilder.tsx` catch the warning and prompt HR to confirm via `window.confirm` before retrying with force.
- **Notification types**: `COURSE_DUE_REMINDER`, `COURSE_OVERDUE`, `COURSE_NUDGE`, `COURSE_CERTIFICATE_EXPIRING` — all route to the Learning tab in `Dashboard.tsx`.
- Also fixed 4 pre-existing `Dashboard.tsx` diagnostics found along the way (unused `Shield`/`DropdownOption` imports, `departments` array type narrowing in `EmployeesPanel`, a no-op `await` on a sync `onRefresh` callback).

What's confirmed built — Phase 2 (in progress):
- **Ranking/leaderboard**: `Course.enableRanking` (bool, default false — rejected at the API layer, not just hidden in UI, when `mandatory=true`, both at create-time and via a DB-state-aware check on update so neither field can be flipped into an invalid combination), `rankingScope` (`DEPARTMENT` default | `ORG_WIDE`), `rankingAnonymous` (default true), `rankingMinCohortSize` (default 8). New `GET /learning/courses/:id/leaderboard` ranks by each learner's average best-passed-`QuizAttempt` score across the course's quiz modules, total time-taken as tie-breaker; suppressed entirely below the minimum cohort size (returns score-only); anonymous mode shows the learner only their own rank/percentile; Manager/HR/Leadership always get the full named list within their scope regardless of the course's anonymity setting. Frontend: `CourseComposer.tsx` ranking toggle (auto-disabled/hidden when mandatory is checked) with scope + anonymity controls; new `LeaderboardPanel.tsx` embedded in `CourseDetailView.tsx`; amber "Ranked" badge on catalog cards. No "cohort" scope (dropped per explicit decision — no batch/cohort entity exists in the schema; kept to department + org-wide only).
- **Learning paths**: new `LearningPath` (title/description/mandatory/targetDepartment/navigationMode/state — same lifecycle shape as `Course`), `LearningPathCourse` (ordered join table), `PathEnrollment` (mirrors `Enrollment`'s status/dueDate/assignedById). Full CRUD + publish/unpublish (HR), add/remove courses, self-enroll (auto-enrolls the learner in the path's first course too) and manual assign (HR/Manager/Leadership, scoped) on `server/src/routes/learning.ts`. New `evaluatePathProgress()` hooks into the existing `evaluateCourseCompletion()` — whenever any course completes, it checks every path containing that course: marks the `PathEnrollment` complete once every course in the path is individually completed, and for `SEQUENTIAL` paths auto-enrolls the learner in the next course. `GET /my/path-enrollments` returns each course's per-learner completion status inline. Frontend: `LearningPathComposer.tsx` (HR: create → add courses → publish), `LearningPathsPanel.tsx` (catalog browse, self-enroll, assign, path-detail player with per-course lock/start/continue/review), `AssignPathDialog.tsx`. New "Paths" sub-tab in `Dashboard.tsx`'s `LearningPage`; `PATH_ASSIGNED` notifications route there too.
- **Admin dashboard drill-down** (addendum FR-6.9/6.10): factored the existing department-summary aggregation into shared `RollupStats`/`emptyRollup`/`addToRollup`/`withCompletionRate` helpers in `learning.ts`. New `GET /admin/departments/:department/teams` (groups a department's enrollments by each employee's primary manager — "team" = direct reports only, not the full reporting subtree) and `GET /admin/teams/:managerId/members?department=X` (named individuals + stats; `managerId=none` covers the "no manager assigned" bucket). Frontend: `AdminLearningDashboard.tsx` rewritten with click-to-expand Org → Department → Team → Individual drill-down + breadcrumb trail, plus a horizontal bar cross-department comparison chart (FR-6.10) above it.
- **Nomination + manager-approval enrollment** (BRD FR-3.4): `EnrollmentStatus` extended with `NOMINATED`/`PENDING_APPROVAL`/`REJECTED`; `Course.requiresApproval` + `LearningPath.requiresApproval` (both default false). Self-enroll into an approval-required course/path now creates a pending request (notifies manager(s)+HR) instead of activating immediately. 12 new endpoints across courses and paths: nominate (manager picks one employee, who must accept/decline) and approve/reject (decides a self-enroll request) — both directions, for both courses and paths, all scoped via `getScopedEmployeeIds`. Along the way, closed 3 real gaps where a learner could bypass the pending state via direct API calls: the nudge endpoint, the progress-heartbeat endpoint, and the quiz-attempt endpoint all now reject calls against a non-active enrollment; the reminder scheduler was also silently nagging learners about courses nobody had approved yet — fixed to only consider `NOT_STARTED`/`IN_PROGRESS`/`FAILED`. Frontend: `MyLearningPanel.tsx`/`LearningCatalogPanel.tsx`/`LearningPathsPanel.tsx` show per-status UI (Accept/Decline, Awaiting Approval, Not Approved); `TeamLearningPanel.tsx` got Approve/Reject; new `NominateDialog.tsx` + Nominate buttons; `CourseComposer.tsx`/`LearningPathComposer.tsx` got the "requires approval" toggle.
- **ILT scheduling, capacity, attendance + calendar integration** (BRD FR-4.5, FR-7.4): new dedicated router `server/src/routes/ilt.ts` mounted at `/api/ilt` (kept separate from the now very large `learning.ts`). Schema: `ILTSession` (title/instructor/location/start/end/capacity/targetDepartment/state, optional link to an existing `Course`) and `ILTRegistration` (`REGISTERED`/`WAITLISTED`/`CANCELLED`/`ATTENDED`/`NO_SHOW`). Self-register auto-waitlists once a session is full; cancelling a registered seat auto-promotes the longest-waiting waitlisted person and notifies them (`ILT_WAITLIST_PROMOTED`); HR can cancel a whole session, which notifies every registrant (`ILT_SESSION_CANCELLED`); attendance marking is a single batch call that also flips the session to `COMPLETED`. Frontend: `ILTSessionComposer.tsx` (HR create+publish), `ILTSessionsPanel.tsx` (browse/register/cancel, List/Calendar toggle, HR-only "Manage" → attendance marker), `ILTCalendarView.tsx` (month-grid calendar of sessions, click a day's session to manage it — this **is** the calendar integration; no external calendar sync exists anywhere in this app, consistent with the rest of the codebase). New "Live Training" sub-tab in `Dashboard.tsx`'s `LearningPage`.
- **Performance Management integration** (BRD FR-7.3) — **read-only summary, by explicit decision**, not an auto-updating linked KPI (considered, dropped for now since it would touch the `Kpi` model itself; can revisit later if a real need surfaces). New `GET /learning/employees/:employeeId/summary` (course/path completion counts, mandatory-course compliance rate, ILT attendance, certificates earned), permission-checked via the existing `assertCanAccessEmployee` helper (the same one `attendance.ts` already uses for self/manager/HR scoping — no new permission logic needed). New "Learning" sub-tab inside the existing `PerformanceTab.tsx` (alongside KRAs/KPIs), showing completion-rate bars and a 4-stat summary grid.
- Both frontend and backend typecheck/build clean as of this change.

**Phase 2 is fully closed — all six Section 4 items shipped.** Per the parent BRD, **Phase 3 is explicitly out of scope** (AI recommendations, gamification beyond ranking, native mobile app, third-party content marketplace) — there is no more committed L&D module work queued.

**Suggested next session opener:** none of this has been run yet — only typechecked and built. A full manual QA pass across everything is the real next step, not another feature, before calling any of it go-live ready: (1) ranking: create a non-mandatory course with ranking enabled (department scope, anonymous), confirm suppression below the cohort minimum and the correct anonymous/named view split by role; confirm the API rejects ranking on mandatory courses both at create and update time. (2) learning paths: SEQUENTIAL path with 2-3 courses — confirm locking, auto-unlock, and path-level completion rollup; confirm FREE-order has no locking. (3) admin drill-down: department → team → individual click-through, including the "no manager assigned" bucket. (4) nomination/approval: nominate a direct report, confirm Accept/Decline gating; toggle "requires approval," confirm `PENDING_APPROVAL` blocks nudge/progress/quiz-attempt via direct API calls. (5) ILT: register into a full session and confirm waitlisting, cancel a registered seat and confirm auto-promotion + notification, cancel a whole session and confirm every registrant is notified, mark attendance and confirm the session flips to `COMPLETED`, check the calendar view renders sessions on the right day and "Manage" opens the right session. (6) Performance integration: open an employee's Performance tab → Learning, confirm the numbers match what's actually enrolled/completed for that person, confirm a Manager can see their own report's summary but not someone outside their hierarchy (403 via `assertCanAccessEmployee`). (7) grading/badges: configure grade tiers on a quiz, attempt it, confirm the right tier label appears on the result screen and persists on `QuizAttempt`; create a QUIZ_GRADE badge matching that tier's label and confirm it's awarded + notified exactly once even after retaking the quiz again at the same tier; create a COURSE_COMPLETION_COUNT badge at a low threshold and confirm it awards on the Nth course completion, not before, not twice. Also worth a non-functional check: confirm `prisma db push` workflow used throughout this session gets converted to tracked `prisma migrate` files before any real production deploy — push is a dev convenience, not a deploy-safe migration strategy.

---

## 1. Codebase Reality Check (what exists vs what the BRD assumes)

| BRD assumption | Actual state in this codebase | Decision |
|---|---|---|
| S3/object storage for media (BRD §9.2) | No object storage. Existing pattern is either base64-in-MySQL (`AnnouncementMedia.url`) or local disk (`server/uploads/avatars/`) | **Base64 in DB**, matching the Announcement/HeroBanner pattern exactly. Revisit only if storage volume becomes a real problem post-launch. |
| Background job scheduler for reminders/escalations (BRD §8, §9.2) | No node-cron/bull/agenda. Zero scheduled jobs anywhere in the app today | **Skip scheduled reminders in Phase 1.** Emails fire only on real-time events (assignment, completion) — this already works today via the existing `mailer.ts` pattern. Full T-7/T-3/overdue/escalation matrix becomes **Phase 1.5**, once a scheduler is added. |
| Server-side PDF certificates (BRD §9.2, FR-5.2) | No PDF library installed anywhere | **Add a PDF library in Phase 1** (`pdf-lib`, lightweight, no headless browser needed) — certificates are core to the module's value, worth the one new dependency. |
| Dynamic Role/Permission tables (BRD §2, §9.2) | Hardcoded `Role` enum (`EMPLOYEE`, `MANAGER`, `HR`, `LEADERSHIP`) checked via `authorize('HR')` string comparisons everywhere | **Reuse the existing hardcoded roles** for Phase 1 — `HR` authors courses (same tier as Announcements/Hero Banners today), `MANAGER` gets team-oversight, `EMPLOYEE` is the learner. Matches the BRD's own stated Phase 1 reality (Admin authors directly, no separate Instructor role yet). Dynamic RBAC is deferred indefinitely — not scheduled into any phase below; revisit only if a real Instructor-role need materializes. |
| Video content storage | N/A — new requirement | **Both embed links (YouTube/Vimeo, reusing the existing `classifyLink`/embed-parsing code from Announcements) AND small direct video file uploads, capped at 50MB, base64.** Accepting some DB bloat risk on the upload path in exchange for flexibility; embed links remain the cheap default path. |

---

## 2. Phase 1 (MVP) — What We're Building First

Scope = BRD's FR-1, FR-2 (no versioning), FR-3.1/3.3 (manual + self-enroll only, no rule-engine), FR-4.1–4.4 (video+document+quiz, no SCORM/xAPI), FR-5.1/5.2 (completion + certificate, no expiry), FR-6 (basic dashboards), plus the addendum's progress-tracker and org/team-view features that the addendum's own Section 4.5 already scoped to Phase 1.

### 2.1 Data model (new Prisma models)

Reusing existing `Employee`/`User`/`Role` — no schema changes to those. New models:

- **Course** — title, description, category, skillTags (string array or comma-separated for Phase 1 simplicity), durationMinutes, language, thumbnailUrl (base64), mandatory (bool), targetDepartment (string, nullable = all depts — same pattern as `Announcement.targetDepartment`), navigationMode (`FREE` | `SEQUENTIAL`), state (`DRAFT` | `PUBLISHED` | `UNPUBLISHED` | `ARCHIVED`), createdById, timestamps.
- **CourseModule** — courseId, title, sortOrder, contentType (`VIDEO_FILE` | `VIDEO_EMBED` | `DOCUMENT` | `QUIZ`), contentUrl (base64 or embed link, nullable for quiz-only modules), durationMinutes (nullable, for video).
- **Quiz** — moduleId (1:1), passPercentage, maxAttempts, timeLimitMinutes (nullable), randomizeOrder (bool).
- **QuizQuestion** — quizId, questionText, sortOrder.
- **QuizOption** — questionId, optionText, isCorrect.
- **QuizAttempt** — quizId, employeeId, attemptNumber, score, passed (bool), answersJson, startedAt, completedAt.
- **Enrollment** — courseId, employeeId, status (`NOT_STARTED` | `IN_PROGRESS` | `COMPLETED` | `FAILED`), assignedById (nullable for self-enroll), dueDate (nullable), startedAt, completedAt. Unique on (courseId, employeeId).
- **ModuleProgress** — enrollmentId, moduleId, status (`NOT_STARTED` | `IN_PROGRESS` | `COMPLETED`), lastPositionSeconds (video resume) or lastPageViewed (document resume), timeSpentSeconds, completedAt.
- **Certificate** — enrollmentId (1:1), certificateNumber (unique, human-verifiable), issuedAt, pdfBase64 (the generated certificate, stored same pattern as other base64 media).

No `AssignmentRule`, `LearningPath`, `NotificationLog`, or `AuditLog` tables yet — explicitly deferred to later phases per Section 3 below.

### 2.2 Backend routes (new `server/src/routes/learning.ts`, mounted at `/api/learning`)

Following the existing `salary.ts`/`announcements.ts` conventions (`asyncHandler`, `validate(zodSchema)`, `authorize('HR')`):

- `GET /courses` — catalog list, filtered by target audience + published state (everyone, scoped like Announcements' department targeting).
- `POST /courses` — create (HR only), `multer` for thumbnail, same memoryStorage→base64 pattern as `announcements.ts`.
- `PUT /courses/:id` — edit (HR only). **No versioning in Phase 1** — editing a published course's modules directly updates it; in-progress learners are NOT protected from module changes yet (BRD §7.3's versioning safeguard is explicitly deferred to Phase 1.5, see Section 3).
- `POST /courses/:id/publish`, `POST /courses/:id/unpublish`, `DELETE /courses/:id` (archive, soft-delete like Employee/Announcement).
- `POST /courses/:id/modules` — add module (HR only), multer for video/document upload OR embed link via `classifyLink`-style validation.
- `POST /courses/:id/quiz` — attach quiz with questions/options (HR only).
- `POST /courses/:id/enroll` — self-enroll (any employee, if course allows it) or manual assign (HR/Manager, with employeeId list + optional dueDate).
- `GET /my/enrollments` — learner's own enrollments + progress (self-scope, same `scopeData` pattern as salary/leaves).
- `POST /enrollments/:id/progress` — heartbeat-style progress update (module + position/page + timeSpent). Called periodically by the video/document viewer, same spirit as BRD FR-4.3.
- `POST /enrollments/:id/quiz-attempt` — submit quiz answers, server grades, creates `QuizAttempt`, evaluates course completion criteria, triggers certificate generation if passed.
- `GET /my/certificates`, `GET /certificates/:certificateNumber/verify` — public-ish verification endpoint (BRD FR-5.5), no auth required, returns minimal certificate validity info only.
- `GET /team/progress` — manager's "My Team" rollup (addendum FR-6.8, minus the nudge button — see 2.4).
- `GET /admin/dashboard` — HR's org-wide rollup (addendum FR-6.9 basic version — department-level grouping, no full org→dept→team→individual drill-down interaction yet, see Section 3).

### 2.3 Certificate generation

- New `server/src/utils/certificateGenerator.ts` using `pdf-lib` — simple templated PDF (learner name, course title, completion date, certificate number), generated server-side on quiz-pass / completion-criteria-met, stored as base64 in `Certificate.pdfBase64`, same retrieval pattern as other base64 assets.
- Certificate number format: human-readable + verifiable, e.g. `CERT-{courseId}-{employeeId}-{timestamp36}`.

### 2.4 Frontend

- New `Learning` tab in `Dashboard.tsx` nav items (icon: `BookOpen` or similar), visible to all roles.
- `LearningCatalogPanel.tsx` — course cards (reuse `AnnouncementSpotlight`-style card patterns), filter by category/department, self-enroll button.
- `CourseDetailView.tsx` — module list with progress checkmarks/locks (addendum §1.2), video/document viewer with heartbeat progress posting, quiz-taking UI.
- `MyLearningPanel.tsx` — learner's enrolled courses grouped Mandatory/Optional, resume CTA (addendum FR-4.7), certificate download list.
- `CourseComposer.tsx` (HR-only) — course creation/edit form + module builder, following the same modal patterns as `AnnouncementComposer.tsx`/`HeroBannerComposer.tsx`.
- `TeamLearningPanel.tsx` (Manager) — per-report status table, overdue highlighted red. **No one-click nudge button in Phase 1** — see Section 3 (nudge needs the notification-cap guardrail from the addendum's FR-8.1, which depends on having more than one notification source to cap; trivial to add once Phase 1.5's reminder emails exist).
- `AdminLearningDashboard.tsx` (HR) — department-level completion rollup, basic bar chart. No drill-down click-to-expand interaction yet (static, filterable, not interactive-drill — see Section 3).

### 2.5 Explicitly NOT in Phase 1

- SCORM/xAPI packages (BRD §6, out of scope until a runtime library decision is made — BRD §7.5 already flags this as a multi-week risk on its own).
- Course versioning (BRD FR-2.4) — editing a published course just edits it in place for now.
- Rule-based auto-assignment (BRD FR-3.2) — no scheduler to evaluate rules against yet.
- Nomination/Manager-approval enrollment flow (BRD FR-3.4) — Phase 1 is manual-assign or open self-enroll only, no approval gate.
- Instructor-led training/ILT scheduling (BRD FR-4.5).
- Certificate expiry/renewal (BRD FR-5.3) — no scheduler to evaluate expiry against yet.
- Ranking/leaderboard (addendum §2) — per addendum's own Section 4.5, this is gamification and belongs in Phase 2 per the parent BRD's explicit scope boundary.
- Manager one-click nudge button and the combined notification cap (addendum FR-6.8, FR-8.1) — meaningful once there's more than one notification source; ships with Phase 1.5's reminder engine.
- Admin dashboard's interactive drill-down and cross-department comparison chart (addendum FR-6.9/6.10) — Phase 1 ships a flatter, filterable version; the click-to-expand interaction is a fast-follow.

---

## 3. Phase 1.5 — Scheduler-Dependent Features

Unlocked once a job scheduler is added (recommend `node-cron` — lightweight, no new infra dependency like Redis that `bull` would need).

- Due-date reminder emails (T-7/T-3/T-1, BRD §8 matrix).
- Overdue recurring notices + manager escalation emails.
- Manager one-click nudge button (addendum FR-6.8) + combined per-learner daily notification cap (addendum FR-8.1) — both only meaningful once multiple notification sources actually compete for the learner's attention.
- Rule-based auto-assignment engine (BRD FR-3.2).
- Certificate expiry/renewal reminders (BRD FR-5.3).
- Course versioning (BRD FR-2.4) — protecting in-progress learners' state when a published course is edited; bundled here because it's a meaningful chunk of work better scoped with the rest of the "courses now have a lifecycle that triggers background behavior" theme.
- SCORM/xAPI support — **separate decision point, not automatically bundled into 1.5.** BRD §7.5 already flags this as its own multi-week risk; revisit as its own mini-phase once Phase 1 usage data shows real demand for third-party authored content, rather than committing to it now.

---

## 4. Phase 2 — Engagement & Richer Workflows

Matches the parent BRD's own Phase 2 (§9.3) plus the addendum's ranking feature, which the addendum's Section 4.5 explicitly placed here (gamification boundary, BRD §1.2):

- Ranking/leaderboard (addendum §2, FR-4.8–4.11, FR-6.7) — anonymous-by-default, admin-configurable per course, disabled on mandatory courses, minimum-cohort-size guard.
- Learning paths (bundles of courses).
- Nomination + manager-approval enrollment workflow (BRD FR-3.4).
- ILT scheduling, capacity, attendance.
- Admin dashboard's full org→dept→team→individual drill-down interaction + cross-department comparison chart (addendum FR-6.9/6.10 full version).
- Performance Management integration (BRD FR-7.3).
- Calendar integration for ILT (BRD FR-7.4).

## 5. Phase 3 — Out of scope for now

AI recommendations, gamification beyond ranking (badges/points), native mobile app, third-party content marketplace — matches parent BRD §9.3 exactly, no changes.

---

## 6. Build Order Within Phase 1 (sprint-level sequencing)

Recommended order so each step is independently testable before the next depends on it:

1. **Schema + migration** — all Phase 1 models from Section 2.1, `prisma db push` + regenerate client.
2. **Course CRUD (HR)** — backend routes + `CourseComposer.tsx`, no enrollment yet. Verify: HR can create/publish/archive a course with modules.
3. **Catalog + self-enroll (Employee)** — `LearningCatalogPanel.tsx`, `POST /courses/:id/enroll`. Verify: employee can browse and self-enroll.
4. **Module consumption + progress tracking** — `CourseDetailView.tsx`, heartbeat progress endpoint, resume CTA. Verify: progress % updates correctly, resume works after closing/reopening.
5. **Quiz engine** — question/option CRUD (part of course composer), quiz-taking UI, grading endpoint. Verify: pass/fail evaluated correctly, attempt history retained.
6. **Completion + certificate** — completion-criteria evaluation, `certificateGenerator.ts`, certificate download + verify endpoint. Verify: certificate PDF generates correctly and verification endpoint confirms authenticity.
7. **Manual assignment (HR/Manager)** — extend enroll endpoint for assigning others, due dates. Verify: assigned learner sees it in My Learning with due date.
8. **Team + admin dashboards** — `TeamLearningPanel.tsx`, `AdminLearningDashboard.tsx`. Verify: manager sees only their team, HR sees org-wide.

Each numbered step above is a reasonable sprint-sized unit and should be demo-able on its own before moving to the next.

---

*This build plan should be treated as living — update Section 3/4 scope if Phase 1 usage reveals different priorities than assumed here. Phase 1 itself (Section 2 and Section 6) is considered locked for implementation.*
