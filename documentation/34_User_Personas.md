# ZYNOTRIX — User Personas

Five detailed user personas representing the primary archetypes who use ZYNOTRIX. Each is grounded in the actual feature set of the application.

---

## Persona 1: The Engineering Lead

**Name**: Arjun Mehta  
**Role**: Senior Engineering Manager  
**Company Size**: 45 people (Series A startup)  
**Tech Sophistication**: High  
**ZYNOTRIX Role**: ADMIN

### Background
Arjun manages three squads (frontend, backend, infra) and reports to the CTO. He's tried Linear, Jira, ClickUp, and Notion at previous companies. He's been burned by complex configuration, poor mobile UX, and tools that only work for engineers — not for PMs or designers who need to collaborate with his teams.

### Goals
- Know which project is at risk **before** his weekly leadership meeting
- Reduce standup time from 30 minutes to 10
- See team workload without asking each person "what are you working on?"
- Have a single source of truth for project status when executives ask

### ZYNOTRIX Touchpoints
- **Daily**: Dashboard AI Insights for health alerts; Kanban board for squad status
- **Weekly**: AI-generated reports; workload view to identify burnout risks
- **Ad-hoc**: Command palette (`Ctrl+K`) to jump to any project instantly
- **Management**: Admin panel to manage roles; reward configs to incentivize task completion

### Pain Points Solved
- Project health score replaces manual status tracking
- AI standup summary replaces the "any blockers?" round-robin
- Workload view shows who's overloaded vs. idle

### Frustrations with ZYNOTRIX
- No mobile app — can't check status on his phone
- Can't drill into the audit log through the UI
- AI health score doesn't yet factor in code review cycle time (no GitHub integration)

### Quote
*"I don't need another tool that shows me my tasks. I need something that tells me what I don't know yet."*

---

## Persona 2: The Product Manager

**Name**: Layla Chen  
**Role**: Senior Product Manager  
**Company Size**: 60 people  
**Tech Sophistication**: Medium  
**ZYNOTRIX Role**: MANAGER

### Background
Layla manages the roadmap for a B2B SaaS product. She writes specs in Notion, uses Jira for task tracking, and coordinates across engineering, design, and customer success. She spends 20% of her time in status meetings that could be emails.

### Goals
- Maintain a clear roadmap that engineers can work from directly
- Know at any moment what's shipped, in progress, and blocked
- Communicate project status to stakeholders without preparing a deck
- Keep the team motivated through quarterly cycles

### ZYNOTRIX Touchpoints
- **Sprint planning**: Sprint view to organize backlog and assign story points
- **Status updates**: Client Portal to share project progress with the CEO
- **Documents**: Requirements docs linked to tasks
- **AI**: Health score to flag risks; AI reports for quarterly reviews
- **Meetings**: Scheduling sprint ceremonies and syncs

### Pain Points Solved
- Documents live next to tasks (no context-switching to Notion)
- Client Portal gives stakeholders read-only visibility without full access
- AI report replaces the "write the weekly update" task

### Frustrations with ZYNOTRIX
- No task comments — team discussions happen in Slack (disconnected)
- Can't bulk move tasks when priorities change
- No way to see a dependency graph for cross-team dependencies

### Quote
*"The AI report that writes itself from our actual task data saved me 2 hours of work every Friday."*

---

## Persona 3: The Full-Stack Developer

**Name**: Marcus Thompson  
**Role**: Full-Stack Engineer  
**Company Size**: 25 people  
**Tech Sophistication**: Very High  
**ZYNOTRIX Role**: MEMBER (elevated to MANAGER in some projects)

### Background
Marcus is heads-down in code most of the day. He uses Jira reluctantly — opens it to update tasks when his PM asks. He thinks standup is a waste of time. He prefers keyboard-driven tools and gets irritated by "enterprise bloat."

### Goals
- Update task status in under 5 seconds
- Know what he should work on next without a meeting
- Get rewarded (literally, with points) for shipping consistently
- Not have to explain blockers in standups — just show them

### ZYNOTRIX Touchpoints
- **Daily**: Kanban board drag-to-done; command palette to find tasks
- **Motivation**: Rewards leaderboard (competitive with teammates)
- **Communication**: Direct messages to colleagues
- **AI**: Quick AI search when he forgets which task had the login bug

### Pain Points Solved
- Keyboard shortcut `Ctrl+K` replaces clicking through menus
- Gamification makes task updates feel rewarding
- "Move to Done" in one drag earns immediate points

### Frustrations with ZYNOTRIX
- No GitHub PR → Task auto-linking (has to update tasks manually)
- No command-line or API access for automation
- Dark mode is great; but needs more keyboard shortcuts beyond `Ctrl+K`

### Quote
*"I actually update my tasks now because I get points. If Jira had a leaderboard, maybe I would've updated those too."*

---

## Persona 4: The Remote Team Admin / Operations Lead

**Name**: Priya Nair  
**Role**: Operations Manager / People Lead  
**Company Size**: 35 people (fully remote)  
**Tech Sophistication**: Medium  
**ZYNOTRIX Role**: ADMIN

### Background
Priya handles HR operations for a remote-first company. She tracks attendance for payroll, onboards new hires, manages tools subscriptions, and runs employee engagement programs. She's the one who decides which tools the company uses.

### Goals
- Track daily attendance across time zones
- Know who's consistently engaged and who's falling behind
- Run an engagement program (points, rewards) without a separate HR tool
- Get the whole team into one communication hub

### ZYNOTRIX Touchpoints
- **Daily**: Attendance page — who clocked in; who hasn't
- **Weekly**: Leaderboard to see who's most active
- **Monthly**: Coupon creation for reward redemption
- **Admin**: User management, creating accounts, assigning roles
- **Integrations**: Setting up Slack webhook for team announcements

### Pain Points Solved
- Attendance clock-in removes the need for a separate timekeeping tool
- Gamification + coupons replaces a manual points system
- One platform for chat + tasks replaces the Slack + Trello combination

### Frustrations with ZYNOTRIX
- No automatic absence detection (must manually check who didn't clock in)
- No way to export attendance data to payroll system (CSV export not implemented for attendance)
- No email invitation flow for new hires

### Quote
*"I used to use four tools to do what ZYNOTRIX does in one. The attendance + rewards feature alone justified switching."*

---

## Persona 5: The External Stakeholder (Client)

**Name**: Robert Hartley  
**Role**: Founder / CEO of a client company  
**Company Size**: 10 people (client of an agency using ZYNOTRIX)  
**Tech Sophistication**: Low  
**ZYNOTRIX Role**: No login — Client Portal access only

### Background
Robert hired a digital agency to build his company's new website. He doesn't need to see Kanban columns or sprint velocity. He just wants to know: is my project on track? What's been done? What's next?

### Goals
- Get weekly project updates without scheduling a call
- See what's been completed vs. in progress
- Know if there are any blockers affecting his launch date
- Not have to log into another tool with a password he'll forget

### ZYNOTRIX Touchpoints
- **Client Portal** only — accessed via a unique link, no login required
- Views: project status, completed milestones, open tasks, timeline

### What He Sees (Client Portal)
- Project name and overall status
- Task list grouped by status (completed, in-progress, pending)
- Key milestones and due dates
- No access to: internal chat, sensitive project details, team discussions, AI features

### Pain Points Solved
- Gets visibility without having to ask for a status update
- No password to remember — link-based access

### Frustrations with ZYNOTRIX
- Link doesn't persist (new link required after a certain period **[Inferred]**)
- No way to leave comments or feedback on tasks
- Doesn't receive email notifications when something is completed

### Quote
*"I don't need to understand your tools. I just need to see if my website is on schedule. This link does that."*
