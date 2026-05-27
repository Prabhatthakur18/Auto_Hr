# Auto HR Project Flow

## Purpose

This project is an HR management system with a React frontend and an Express + Prisma backend.

It currently covers:

- authentication
- employee management
- profile viewing and editing
- leave management
- attendance management
- salary data
- performance tracking
- announcements
- holidays

The system is now designed around a hierarchy-based access model, so future modules can follow the same visibility rules.

## Current Role Model

The project currently uses these system roles:

- `EMPLOYEE`
- `MANAGER`
- `HR`
- `LEADERSHIP`

### Access meaning

- `EMPLOYEE`
  Can view only their own data.

- `MANAGER`
  Can view their own data plus their full reporting hierarchy.
  This now means not only direct reports, but also nested team members under them.

- `HR`
  Full access across the organization.
  In the current product flow, `HR` is effectively the admin role.

- `LEADERSHIP`
  Full access across the organization, similar to HR for viewing and approvals.

## Hierarchy Model

The employee hierarchy is stored in the `Employee.managerId` field in Prisma.

Each employee can have:

- one manager
- many direct reports

The shared hierarchy access logic lives in:

- [auth.ts](/d:/HR_Project/server/src/middleware/auth.ts)

Important helpers:

- `scopeData`
  Attaches access scope to the request.

- `getDescendantEmployeeIds(managerEmployeeId)`
  Returns the full reporting tree under a manager.

- `getScopedEmployeeIds(req)`
  Returns the employee IDs visible to the logged-in user.

- `assertCanAccessEmployee(req, employeeId)`
  Used when a route needs to validate access to one employee’s data.

This is the main pattern that future features should reuse.

## High-Level Application Flow

## 1. App startup

Frontend entry:

- [App.tsx](/d:/HR_Project/frontend/src/App.tsx)

Backend entry:

- [index.ts](/d:/HR_Project/server/src/index.ts)
- [app.ts](/d:/HR_Project/server/src/app.ts)

Backend startup flow:

1. load environment variables
2. connect Prisma to MySQL
3. register middleware
4. register API routes
5. start server

Frontend startup flow:

1. `AuthProvider` loads
2. app checks token by calling `/api/auth/me`
3. if valid, user session is restored
4. dashboard and profile routes become available

## 2. Authentication flow

Files:

- [auth.ts](/d:/HR_Project/server/src/routes/auth.ts)
- [jwt.ts](/d:/HR_Project/server/src/utils/jwt.ts)
- [AuthContext.tsx](/d:/HR_Project/frontend/src/context/AuthContext.tsx)
- [api.ts](/d:/HR_Project/frontend/src/services/api.ts)

Flow:

1. user submits username and password
2. backend validates credentials
3. backend returns JWT and also sets an httpOnly cookie
4. frontend stores token for API usage
5. later requests use the token in the `Authorization` header
6. backend middleware authenticates and attaches `req.user`

JWT contains:

- `userId`
- `role`
- `employeeId`

## 3. Dashboard flow

Main page:

- [Dashboard.tsx](/d:/HR_Project/frontend/src/pages/Dashboard.tsx)

Dashboard behavior:

- loads employee list
- loads leave list
- loads announcements
- renders role-aware navigation

Current tab behavior:

- employees
- attendance
- leaves
- salary
- reports

Note:

The current `Admin` page exists, but employee creation and most working admin actions are currently handled from the dashboard employee section.

## Core Data Model

Prisma schema:

- [schema.prisma](/d:/HR_Project/server/prisma/schema.prisma)

Main models:

- `User`
  Login account, role, linked employee profile.

- `Employee`
  Master employee profile and hierarchy relation via `managerId`.

- `Leave`
  Leave application, approver information, approval status, comments.

- `Attendance`
  Daily attendance records.

- `SalaryBreakdown`
  Salary components per employee.

- `SalarySlip`
  Generated salary slip records.

- `Kra`
  Performance KRA.

- `Kpi`
  KPI under each KRA.

- `Announcement`
  Company notices.

- `Holiday`
  Holiday calendar.

## Module-by-Module Working

## Employee Management

Backend:

- [employees.ts](/d:/HR_Project/server/src/routes/employees.ts)

Frontend:

- [Dashboard.tsx](/d:/HR_Project/frontend/src/pages/Dashboard.tsx)
- [Profile.tsx](/d:/HR_Project/frontend/src/pages/Profile.tsx)

Current flow:

1. HR creates an employee profile.
2. HR can optionally create a linked system login.
3. HR selects a reporting manager from manager-capable users.
4. Employee data is stored in `Employee`.
5. Optional login is stored in `User`.

Important implementation notes:

- manager assignment is validated
- only users with `MANAGER` or `LEADERSHIP` role can be assigned as manager
- employee cannot be their own manager
- employee list access is hierarchy-scoped

## Profile Flow

Profile route:

- `/profile/:id`

Frontend file:

- [Profile.tsx](/d:/HR_Project/frontend/src/pages/Profile.tsx)

Profile contains tabs for:

- about
- performance
- leaves
- attendance

The profile page is already wired to the hierarchy access rules, so:

- employee can open own profile
- manager can open their own profile and any employee in their reporting tree
- HR and leadership can open all profiles

## Leave Flow

Backend:

- [leaves.ts](/d:/HR_Project/server/src/routes/leaves.ts)

Frontend:

- [Dashboard.tsx](/d:/HR_Project/frontend/src/pages/Dashboard.tsx)
- [LeavesTab.tsx](/d:/HR_Project/frontend/src/components/tabs/LeavesTab.tsx)

Current working:

1. employee applies for leave
2. request stores:
   - leave type
   - start date
   - end date
   - days
   - reason
   - approver IDs
3. managers, HR, and leadership can review according to permissions

Visibility rules:

- employee sees own leave data
- manager sees own leave data plus full team hierarchy leave data
- HR and leadership see everything

Dashboard categorization:

- employees see their own leave history
- managers get `My Leaves` and `Team Leaves`
- HR and leadership get `My Leaves` and organization-wide leave view

## Attendance Flow

Backend:

- [attendance.ts](/d:/HR_Project/server/src/routes/attendance.ts)

Frontend:

- [AttendancePanel.tsx](/d:/HR_Project/frontend/src/components/AttendancePanel.tsx)
- [AttendanceTab.tsx](/d:/HR_Project/frontend/src/components/tabs/AttendanceTab.tsx)

Current working:

- attendance can be viewed by month
- HR can upload biometric raw text
- HR can upload Excel attendance exports
- HR can add or edit manual attendance records
- attendance can also be synced from supported biometric device flow

Hierarchy behavior:

- employee sees own attendance
- manager can access attendance for full reporting tree
- HR and leadership can access all employees

This structure is already future-safe because the route access is now based on shared hierarchy helpers, not route-specific direct report checks.

## Salary Flow

Backend:

- [salary.ts](/d:/HR_Project/server/src/routes/salary.ts)

Current working:

- salary breakdowns are stored per employee
- salary slips can be generated per month
- access is hierarchy-aware

Hierarchy behavior:

- employee sees own salary and slips
- manager can access salary data for full reporting tree
- HR and leadership can access all salary data

Note:

Even if the salary UI grows later, the access base is already aligned with hierarchy rules.

## Performance Flow

Backend:

- [performance.ts](/d:/HR_Project/server/src/routes/performance.ts)

Frontend:

- [PerformanceTab.tsx](/d:/HR_Project/frontend/src/components/tabs/PerformanceTab.tsx)

Current working:

- KRAs are created per employee
- KPIs are created under KRAs
- overall score is calculated from KPI scores

Hierarchy behavior:

- employee sees own performance
- manager can access performance for full reporting tree
- HR and leadership can access all performance data

## Announcements and Holidays

Backend:

- [announcements.ts](/d:/HR_Project/server/src/routes/announcements.ts)
- [holidays.ts](/d:/HR_Project/server/src/routes/holidays.ts)

These are organization-level modules and are not hierarchy-restricted in the same way as employee-owned data modules.

## Backend Structure

Main folders:

- `server/src/routes`
  API route modules.

- `server/src/middleware`
  authentication, validation, error handling, access scope.

- `server/src/config`
  environment and database setup.

- `server/src/utils`
  JWT, password hashing, shared helpers.

- `server/prisma`
  schema and seed data.

Route registration happens in:

- [app.ts](/d:/HR_Project/server/src/app.ts)

## Frontend Structure

Main folders:

- `frontend/src/pages`
  page-level screens such as dashboard and profile.

- `frontend/src/components`
  reusable UI components.

- `frontend/src/components/tabs`
  profile and module tab sections.

- `frontend/src/context`
  auth state management.

- `frontend/src/services`
  API integration layer.

Main frontend patterns:

- `api.ts` is the central API client
- auth state comes from `AuthContext`
- dashboard is the primary working screen
- profile page is the primary per-employee detail screen

## How New Features Should Be Added

For all future employee-owned modules like:

- assets
- reimbursements
- documents
- training
- goals
- travel requests
- disciplinary records
- team reports

follow this pattern.

### Backend pattern

1. create a new route file in `server/src/routes`
2. use:
   - `authenticate`
   - `scopeData`
3. if route is for one employee record, use:
   - `assertCanAccessEmployee(req, employeeId)`
4. if route is for list data across many employees, use:
   - `getScopedEmployeeIds(req)`
5. if the user has full access, `getScopedEmployeeIds` returns `null`, which should mean no employee restriction

### Frontend pattern

1. add API methods in [api.ts](/d:/HR_Project/frontend/src/services/api.ts)
2. add UI tab or dashboard section
3. pass employee ID from profile or dashboard context
4. let backend handle the hierarchy filtering
5. keep frontend role checks mostly for presentation, not security

## Recommended Rule For Future Modules

If data belongs to a specific employee, then access should automatically follow:

- self
- full reporting hierarchy
- full organization for HR and leadership

This should be the default rule unless the module is explicitly more sensitive or more open.

## Current Operational Notes

- `HR` currently acts as the admin flow for employee creation and data management.
- `LEADERSHIP` is supported as full-access viewer and reviewer.
- Manager visibility is now hierarchy-based, not only direct-report-based.
- The project is ready for new modules if they reuse the shared access helpers instead of hardcoding role checks in each route.

## Suggested Next Documentation To Add Later

- API endpoint reference
- database entity relationship notes
- module-wise test checklist
- deployment steps
- environment variable setup
- feature roadmap

## Summary

This project now has a reusable foundation:

- central auth flow
- centralized API structure
- employee hierarchy in the data model
- hierarchy-based visibility rules
- modular route-based backend
- dashboard + profile-based frontend flow

The most important architectural decision going forward is:

new employee-related features should be built on top of the shared hierarchy helpers in [auth.ts](/d:/HR_Project/server/src/middleware/auth.ts), so the access model stays consistent across the whole product.
