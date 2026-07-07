# Autoform Connect - Admin / HR User Guide

## 1. Purpose of This Guide

This guide is for Admin, HR, and Manager users who will operate Autoform Connect on a day-to-day basis.

It explains the system in simple business language:

- What each section is used for
- What HR/Admin should configure first
- How common activities should be performed
- What employees can see
- What managers can review
- What to check before sharing the system with all users

This is not a technical document. It is meant for the team that will use and manage the system.

---

## 2. User Roles

The system works based on user roles. Each role sees only the options relevant to them.

| Role | What They Can Do |
| --- | --- |
| Employee | View own profile, attendance, leaves, salary slips, documents, announcements, and learning |
| Manager | View self and team information, review team attendance/leaves/learning/documents where allowed |
| HR | Manage employees, announcements, attendance, leaves, salary import, documents, learning, and reports |
| Leadership | View organization-level information and reports where enabled |

Important note: HR should review every user role before go-live so that employees, managers, HR, and leadership have the correct access.

---

## 3. First-Time Setup Checklist

Before the system is shared with all users, HR/Admin should complete this checklist.

### Employee Setup

- Check that all employees are added.
- Confirm employee names, departments, designations, emails, and phone numbers.
- Confirm manager mapping for each employee.
- Confirm employee status is active for current employees.
- Confirm inactive or resigned employees are not active.

### User Login Setup

- Make sure every active employee has a user account.
- There is no automatic username or password. HR must type both a username and a password when creating each employee's account.
- Recommended convention: use the employee's name (or a short form of it) as the username, and set a simple temporary password of your choice (e.g. the same one for every new joiner, such as `Welcome@123`).
- Share the temporary password with the employee directly (in person or via a secure message), and ask them to change it after first login.
- HR/Admin accounts should use stronger passwords and should not share credentials.

### Payroll Setup

- Confirm each employee has a correct payroll mapping where needed.
- Confirm bank details, PAN, UAN, PF, ESI, PRAN, tax regime, and salary-related details.
- Confirm salary import month before importing payroll.
- Import one test payroll file first and verify the preview before final import.

### Attendance Setup

- Confirm biometric IDs are available for employees where attendance import is used.
- Confirm the attendance month before uploading attendance files.
- Check whether imported attendance is mapped correctly to employees.

### Leave Setup

- Confirm managers and HR approvers are correct.
- Review pending leave requests.
- Train employees to apply from their own login.

### Announcement Setup

- Add important company announcements.
- Add hero banners only for important highlights.
- Use department targeting when an announcement is not for everyone.

### Learning Setup

- Create required courses.
- Add a duration/estimated read time on document modules — this is required for documents and controls how long an employee must spend before they can mark the module complete.
- Set up quiz questions, options, and the correct answer for each question before publishing a course that includes a quiz.
- Publish only verified courses.
- Configure mandatory courses carefully.
- Assign or nominate courses to the correct employees or departments.
- Create badges only after deciding the criteria clearly.
- Use the Manage option on a course to edit details, modules, or quizzes after publishing — review what this changes before using it on a course employees have already started.

### E-Library Setup

- Decide which company-wide PDFs and Word documents should be available to all employees (e.g. policies, handbooks, compliance reading).
- Upload only final, approved documents — every employee is notified the moment a document is added.
- Remove outdated documents instead of leaving multiple versions available.

### Documents Setup

- Inform employees what type of documents they should upload.
- HR/Managers should understand that employees are notified when their documents are downloaded.

---

## 4. Login and Basic Navigation

Users log in with their username and password.

After login, the left menu shows the available sections:

- Home
- Employees / My Profile
- Announcements
- Attendance
- Leaves
- Salary
- Documents
- Learning
- E-Library
- Reports, where available

The notification bell at the top shows important updates such as:

- Leave updates
- Attendance corrections
- Salary slip availability
- New announcements
- Learning assignments and reminders
- New course published
- Course completed by a team member
- Quiz auto-submitted due to a tab switch
- Certificate ready to download
- Course content updated
- New E-Library document available
- Document download notifications

Clicking a notification takes the user to the related section.

---

## 5. Home Page

The Home page gives a quick summary of important items.

HR/Admin can use this area to:

- View company highlights
- Review recent announcements
- See quick business counts such as employees, leaves, and updates

Employees use this page as a starting point for daily actions.

---

## 6. Employee Management

The Employees section is mainly used by HR/Admin.

### What HR Can Do

- Add a new employee.
- Edit employee details.
- Assign manager or reporting hierarchy.
- Update contact details.
- Update department, designation, and employee type.
- Add payroll-related details.
- Create or connect a user account.
- Open employee profile drawer and review:
  - About
  - Performance
  - Leaves
  - Attendance
  - Documents, where available

### Recommended Practice

- Keep employee names consistent with payroll and attendance files.
- Keep department names consistent. Avoid duplicate styles like `Operations`, `operations`, and `OPS`.
- Keep manager mapping updated because it affects approvals and team visibility.

---

## 7. Profile Management

Each employee has a profile containing:

- Basic details
- Department and designation
- Contact details
- Bio description
- Skills
- Education
- Experience
- Payroll information, where HR has access

Employees can view their own profile. HR/Admin can update employee information.

Employees can upload or change their own profile photo from their profile page. HR/Admin can also set or change an employee's photo while editing their profile.

Recommended practice: HR should review employee profiles after import or bulk setup to make sure employee details are complete.

---

## 8. Attendance Management

Attendance is used to track monthly employee attendance.

Attendance data can get into the system in two different ways:

- **Uploading a file** (a biometric device export or an Excel/attendance-portal export) — this always works, regardless of where the system is hosted.
- **Live auto-sync directly from the biometric device** — this only works if the server can reach the biometric machine over the office's local network. It will **not** work if the system is hosted on a cloud platform such as Vercel, since cloud servers cannot reach a device sitting on the office LAN. If this system is cloud-hosted, plan to use file upload as the regular attendance import method.

### HR/Admin Actions

- Select the target month.
- Upload biometric or attendance sheet.
- Review attendance records.
- Manually correct attendance where required.
- Check late, absent, present, and overtime details.

### Manager Actions

- Review attendance for team members.
- Check attendance corrections where allowed.

### Employee Actions

- View own attendance.
- Submit correction request where available.

### Recommended Practice

- Always select the correct month before uploading.
- Review import results after upload.
- Use manual correction only when the attendance file or biometric data needs adjustment.
- Add a proper reason for corrections.

---

## 9. Leave Management

The Leaves section is used to manage leave applications and approvals.

### Employee Actions

- Apply for leave.
- View leave history.
- Track approval status.

### Manager / HR Actions

- View leave requests.
- Approve or reject requests.
- Review leave history by employee, department, manager, type, date, month, or year.
- Use search to quickly find employee names, comments, dates, or leave details.

### Recommended Practice

- Managers should approve or reject leaves promptly.
- Rejection should include a clear reason.
- HR should periodically review pending requests.

---

## 10. Salary and Payroll

The Salary section is used for payroll import, salary history, and employee payslips.

⚠️ **Current limitation:** The payroll import feature is fully built, but the file Tally exports today cannot yet be mapped correctly to the right salary columns (basic, HRA, PF, etc.) — Tally's JSON export doesn't include column labels, so the system cannot safely tell which figure is which. **Do not rely on this feature for real payroll until the development team confirms it has been resolved.** Ask the dev team for the current status before using it for an actual month's payroll.

### For HR/Admin

HR can access:

- Import
- History
- Salary information

### Payroll Import Process

1. Go to Salary.
2. Open Import.
3. Select the payroll month.
4. Upload the payroll export file.
5. Review the preview carefully.
6. Check matched and unmatched employees.
7. Confirm import only when the preview is correct.
8. If salary for the same month already exists, use overwrite only after confirming.

### Payroll History

The History tab shows previous imports:

- Month
- File name
- Imported count
- Skipped records
- Imported by
- Import date

Use search and date/month/year filters to find older imports.

### Employee Payslips

Employees can view and download their own payslips.

Payslip includes:

- Employee details
- Working days
- Present days
- Earnings
- Deductions
- Net amount
- Amount in words

### Recommended Practice

- Do not import final payroll before reviewing the preview.
- Keep employee payroll mapping updated.
- Ask employees to verify payslips after payroll is published.

---

## 11. Document Manager

The Documents section allows employees to store important documents.

### Employee Actions

- Add document title.
- Upload image or PDF document.
- Download own documents.
- Download all own documents when required.

### HR / Manager Actions

- View employee documents where access is allowed.
- Download employee documents.

Important note: When HR/Manager downloads an employee document, the employee receives a notification.

### Recommended Practice

- Employees should use clear document titles, such as `Aadhaar Card`, `PAN Card`, `Experience Letter`, or `Degree Certificate`.
- HR should download documents only when needed.
- Do not delete or edit employee documents without a valid process.

---

## 12. E-Library

The E-Library is different from Document Manager. Document Manager stores each employee's own personal documents. E-Library is a shared collection of company-wide reading material — policies, handbooks, compliance documents, and similar files that every employee should be able to read.

### HR / Manager / Leadership Actions

- Upload a PDF or Word document with a title and an optional description.
- Search the library by title or description.
- Remove a document that is outdated or was uploaded in error.

### Employee Actions

- Browse all documents in the library.
- Mark a document as read.
- Download a document at any time, whether or not it has been marked as read.

Important note: Everyone in the company is notified the moment a new document is added to the E-Library, except the person who uploaded it.

Important note: PDF documents open and can be read directly in the browser. Word documents (`.doc`/`.docx`) cannot be previewed in-browser — employees must download them to view the content.

### Recommended Practice

- Use clear, specific titles so employees know what they are opening, such as `Leave Policy 2026` rather than `Policy Doc`.
- Add a short description summarizing what the document covers.
- Remove old versions when uploading an updated document, rather than leaving both available.

---

## 13. Announcements and Company Updates

Announcements are used for official company communication.

### HR/Admin Can Create

- Text announcements
- Image announcements
- Video announcements
- External link announcements
- Social/video links such as YouTube or Instagram
- Department-specific announcements
- Pinned or high-priority announcements
- Scheduled announcements
- Email-enabled announcements, where configured

### Hero Banners

Hero banners are for important company highlights shown prominently on the Home page.

Use hero banners for:

- Company events
- Major policy updates
- Festival greetings
- Important leadership messages
- Internal campaigns

### Employee Experience

Employees can:

- View announcements.
- Open the detail dialog.
- See media and linked content.
- Mark announcements as read automatically by opening them.

### Recommended Practice

- Keep announcement titles short and clear.
- Use priority carefully. Do not mark everything urgent.
- Use department targeting for department-only updates.
- Use pinned or hero placement only for important communication.

---

## 14. Learning and Development

The Learning section is available to all users.

It includes:

- Catalog
- Paths
- Live Training
- Badges
- My Learning
- Team
- Overview

Available tabs depend on the user's role.

### Catalog

Catalog contains individual courses.

HR can:

- Create courses.
- Add course modules.
- Add videos, documents, or quiz modules.
- Set a duration or estimated read time on a module — required for documents, optional for video.
- Publish or unpublish courses.
- Mark courses as mandatory.
- Enable certificates.
- Assign courses to employees.
- Nominate employees for courses.
- Require approval before enrollment — when this setting is turned on for a course, an employee who tries to enroll must wait for a manager or HR to approve the request before they can start it. Both the requester and the approver are notified at each step.
- Use the **Manage** option on any course card to reopen it later — this is how HR edits course details, adds or removes modules, edits an existing quiz, or publishes/unpublishes/archives a course after it has already been created.

### Editing a Course or Quiz After Publishing

Use the Manage button on a course card (visible to HR, Leadership, and Managers) to:

- Edit the course title, description, audience, mandatory setting, and approval requirement.
- Add, edit, or remove modules.
- Edit an existing quiz — change questions, options, or which option is correct.
- Publish, unpublish, or archive the course.

If anyone has already attempted a quiz, replacing it will ask for confirmation because it erases their attempt history. Confirm only when you are certain the change is needed.

Employees who are already enrolled in a course are notified when HR updates its content, so they know to review what changed.

### Quiz Rules and Tab-Switch Protection

Before an employee can answer quiz questions, they see a rules screen that explains:

- The pass mark and number of attempts allowed.
- That switching tabs, minimizing the window, or opening another app once the quiz has started will submit the quiz automatically with whatever answers were selected so far.

The Continue button stays disabled for 10 seconds so the employee has time to actually read the rules before starting.

If an employee does switch away mid-quiz, the quiz is submitted immediately and the employee sees a message explaining what happened. The employee's manager and HR are also notified that the quiz was auto-submitted, along with the resulting score, so they can follow up if needed.

### Watch and Read Progress

The **Mark as Complete** button on a video or document module is disabled until the employee has genuinely engaged with the content:

- Video modules (uploaded or YouTube/Vimeo) unlock once about 80% of the video has been watched.
- Document modules unlock once the employee has spent roughly 80% of the configured duration on that module — this is why setting a duration on document modules during setup matters.

A progress bar shows how close the employee is to unlocking the button. Older modules created before this feature was added, with no duration set, are not gated.

Employees can:

- Browse published courses.
- Enroll or request approval.
- Start or continue learning.
- Watch or read each module long enough to unlock Mark as Complete.
- Download certificates after completion.

### Learning Paths

Learning paths are groups of courses arranged together.

Use paths when employees must complete multiple courses for one goal, such as:

- New joinee training
- Department training
- Compliance training
- Manager development program

### Live Training

Live Training is used for instructor-led sessions.

HR can:

- Create sessions.
- Set date, time, instructor, location, and capacity.
- Publish sessions.
- Manage attendance.
- Cancel sessions when needed.

Employees can:

- Register for sessions.
- Join waitlist when full.
- Cancel registration if allowed.

If a registered employee cancels, the next person on the waitlist is automatically given their seat and notified.

### Badges

Badges are achievements earned by employees.

Badges can be based on:

- Quiz grade
- Perfect score
- Number of course completions
- Number of path completions
- Number of module completions

### My Learning

Employees can see:

- Assigned courses
- Enrolled courses
- Mandatory courses
- Optional courses
- Due dates
- Course progress
- Certificates
- Expired certificate renewal options

### Team Learning

Managers and HR can see learning status for their team.

They can:

- Track employee course status.
- See overdue learning.
- Send nudges where allowed.
- Approve or reject enrollment requests.
- Use the Pending Approval filter to quickly see which enrollment requests are waiting on a decision, instead of searching through every status.

### Overview

HR/Admin can see department-level learning progress and drill down into teams and employees.

### Recommended Practice

- Keep course names simple and clear.
- Test one course fully before assigning it widely.
- Use mandatory courses only for required training.
- Set realistic due dates.
- Review overdue learning weekly.
- Set a duration on every document module — without it, the watch/read gate cannot apply and Mark as Complete stays unrestricted.
- If editing a course employees have already started, keep changes minor where possible — they will be notified, but large changes mid-course can be confusing.
- Avoid replacing a quiz once people have attempted it unless necessary, since it erases their attempt history.

---

## 15. Notifications

Notifications help users stay updated.

Users may receive notifications for:

- Leave application updates
- Attendance corrections
- Salary slip availability
- New announcements
- Course assignments
- Learning path assignments
- A manager or HR sending a friendly nudge about an overdue or upcoming course
- Being nominated for a course
- Course approval requested (sent to the approver when a course requires approval before enrollment) and the decision (sent to the employee once approved or declined)
- Learning reminders
- Course overdue alerts
- Certificate expiry
- Live training changes, including being promoted from the waitlist into a confirmed seat
- Badge earned
- Document downloads
- A new course being published (sent to employees in the course's target audience)
- A team member completing a course (sent to that employee's manager and HR)
- A quiz being auto-submitted because the employee switched tabs mid-quiz (sent to the employee's manager and HR, with the score)
- A certificate being ready to download (sent to the employee)
- A course's content being updated by HR (sent to everyone already enrolled in that course)
- A new E-Library document being added (sent to everyone except the person who uploaded it)

### Recommended Practice

- HR/Admin should use notifications as the official in-app alert system.
- Users should check notifications regularly.
- Mark all read should be used only after reviewing pending items.
- Managers should treat a quiz auto-submit notification as a prompt to follow up with the employee, not as proof of wrongdoing — they may have simply been interrupted.

---

## 16. Reports

Reports are available to HR/Admin and leadership where enabled.

Reports can help review:

- Employee data
- Attendance
- Leaves
- Salary history
- Learning progress

Recommended practice: HR should use filters and exports only for official reporting and keep downloaded data secure.

---

## 17. Search and Filters

Several pages include search and filters.

Search can be used to find:

- Employee names
- Departments
- Course names
- Announcements
- Payroll files
- Salary slips
- Dates
- Status values

Calendar filters can be used by:

- Date
- Month
- Year

Recommended practice: If a result is not visible, clear filters first and search again.

---

## 18. Recommended Go-Live Process

Before sharing the system with all employees:

1. HR/Admin logs in and verifies employee data.
2. Confirm all active users have login accounts.
3. Confirm manager mapping.
4. Upload a small attendance test file.
5. Import one payroll file in preview mode and verify the results.
6. Create one announcement and confirm employees can see it.
7. Upload one document as employee and test HR download notification.
8. Create one test learning course with a video module, a document module with a duration set, and a quiz, then assign it to a small group.
9. As a test employee, confirm Mark as Complete stays disabled until the video/document is sufficiently watched or read, take the quiz, and confirm the rules screen and 10-second timer appear before questions are shown.
10. Upload one test document to the E-Library and confirm employees are notified and can read, mark as read, and download it.
11. Verify notifications are working, including the new course, completion, certificate, quiz auto-submit, course-update, and E-Library notifications.
12. Share login instructions with employees.

---

## 19. Suggested Employee Login Communication

HR can share a message such as:

> Dear Team,  
> Autoform Connect is now available for employee self-service.  
> Please log in using the username and temporary password HR has shared with you.  
> After login, please review your profile, attendance, leaves, documents, salary slips, announcements, and learning sections.  
> For any correction, please contact HR.

Recommended: Ask employees to change their password after first login.

---

## 20. Common Issues and What to Do

| Issue | What HR/Admin Should Check |
| --- | --- |
| Employee cannot log in | Check user account exists, username spelling, and active status |
| Employee cannot see salary slip | Check salary import and payslip generation for the month |
| Attendance not showing | Check selected month and uploaded attendance file |
| Leave approver incorrect | Check manager mapping |
| Announcement not visible | Check target department, active status, and scheduled date |
| Course not visible | Check course is published and target department is correct |
| Document not visible to manager | Check access permissions and employee relation |
| Mark as Complete stays disabled | Check the module's duration is set (for documents) and that enough of the video/document has actually been watched or read |
| Quiz questions appear with no rules screen | Refresh the page — the rules screen should always appear first; report this if it does not |
| Quiz submitted unexpectedly | Likely the employee switched tabs, minimized the window, or opened another app while the quiz was active — this is expected behavior, not an error |
| E-Library document not visible | Check the document was uploaded successfully and the file type is PDF or Word |
| Notification not received | Check whether action actually triggered notification and user account exists |

---

## 21. Data Handling Guidelines

HR/Admin users should treat system data carefully.

- Salary data is confidential.
- Employee documents are confidential.
- Payroll files should not be shared casually.
- Downloaded reports should be stored securely.
- Login credentials should not be shared.
- HR/Admin passwords should be stronger than temporary employee passwords.

---

## 22. Final Handover Notes

Autoform Connect has been prepared as a central employee self-service and HR management system.

The main areas are:

- Employee profile management
- Attendance management
- Leave management
- Salary and payroll import
- Payslip download
- Document manager
- E-Library
- Announcements and company updates
- Learning and development, including course/quiz editing and watch/read progress tracking
- Notifications
- Reports

HR/Admin should perform the first go-live checks, then share login details and usage instructions with employees.

