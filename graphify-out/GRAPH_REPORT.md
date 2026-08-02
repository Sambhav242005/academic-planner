# Graph Report - .  (2026-07-30)

## Corpus Check
- 132 files · ~54,544 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 174 nodes · 41 edges · 140 communities (5 shown, 135 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- API Endpoints
- Database Schema
- Database Schema
- Database Schema
- Database Schema
- Module 5
- Module 6
- API Endpoints
- API Endpoints
- API Endpoints
- API Endpoints
- API Endpoints
- API Endpoints
- API Endpoints
- API Endpoints
- API Endpoints
- API Endpoints
- API Endpoints
- API Endpoints
- API Endpoints
- API Endpoints
- API Endpoints
- API Endpoints
- API Endpoints
- API Endpoints
- API Endpoints
- API Endpoints
- API Endpoints
- API Endpoints
- API Endpoints
- API Endpoints
- API Endpoints
- API Endpoints
- API Endpoints
- API Endpoints
- API Endpoints
- API Endpoints
- API Endpoints
- API Endpoints
- API Endpoints
- API Endpoints
- Database Schema
- Database Schema
- Database Schema
- Database Schema
- Authentication
- Authentication
- Features
- Features
- Features
- Features
- Features
- Module 52
- Features
- Features
- Features
- Database Schema
- Module 57
- Features
- Module 59
- API Endpoints
- API Endpoints
- API Endpoints
- UI Components
- UI Components
- UI Components
- UI Components
- Module 67
- API Endpoints
- API Endpoints
- API Endpoints
- API Endpoints
- API Endpoints
- Authentication
- Authentication
- Authentication
- Authentication
- Authentication
- Authentication
- API Endpoints
- API Endpoints
- Shared Libraries
- Shared Libraries
- Shared Libraries
- Shared Libraries
- Shared Libraries
- Shared Libraries
- Shared Libraries
- Shared Libraries
- Shared Libraries
- Shared Libraries
- Shared Libraries
- Shared Libraries
- Shared Libraries
- Shared Libraries
- Authentication
- Authentication
- Authentication
- Authentication
- Authentication
- Authentication
- Authentication
- Authentication
- Authentication
- Authentication
- Shared Libraries
- Shared Libraries
- Shared Libraries
- Shared Libraries
- Shared Libraries
- Shared Libraries
- Shared Libraries
- Shared Libraries
- Shared Libraries
- Shared Libraries
- Shared Libraries
- Shared Libraries
- Shared Libraries
- Shared Libraries
- Shared Libraries
- Shared Libraries
- Shared Libraries
- Shared Libraries
- Shared Libraries
- Shared Libraries
- Shared Libraries
- Shared Libraries
- Shared Libraries
- Module 128
- Module 129
- Module 130
- Module 131
- API Endpoints
- Module 133
- Module 134
- Module 135
- Module 136
- Module 137
- Module 138
- Module 139

## God Nodes (most connected - your core abstractions)
1. `Academic Planner` - 10 edges
2. `class_instances` - 6 edges
3. `subjects` - 5 edges
4. `recurring_classes` - 5 edges
5. `Settings` - 4 edges
6. `Attendance Tracking` - 3 edges
7. `Calendar` - 3 edges
8. `Dashboard` - 3 edges
9. `semesters` - 3 edges
10. `attendance_records` - 3 edges

## Surprising Connections (you probably didn't know these)
- `Academic Planner` ----> `MCP Server`  [EXTRACTED]
  README.md → AI.md
- `Academic Planner` ----> `motion.dev`  [EXTRACTED]
  README.md → AGENTS.md
- `Academic Planner` ----> `NextAuth.js v5`  [EXTRACTED]
  README.md → AI.md
- `Academic Planner` ----> `Next.js 14`  [EXTRACTED]
  README.md → AGENTS.md
- `Academic Planner` ----> `Resend`  [EXTRACTED]
  README.md → AI.md

## Import Cycles
- None detected.

## Communities (140 total, 135 thin omitted)

### Community 0 - "API Endpoints"
Cohesion: 0.17
Nodes (12): Academic Planner, /api/mcp, MCP Server, motion.dev, NextAuth.js v5, Next.js 14, Resend, shadcn/ui (+4 more)

### Community 1 - "Database Schema"
Cohesion: 0.25
Nodes (9): Analytics, /api/analytics, /api/attendance, /api/calendar, Attendance Tracking, attendance_records, Calendar, class_instances (+1 more)

### Community 2 - "Database Schema"
Cohesion: 0.25
Nodes (9): /api/dashboard, /api/subjects, /api/timetable, Dashboard, recurring_classes, semesters, Subjects CRUD, subjects (+1 more)

### Community 3 - "Database Schema"
Cohesion: 0.50
Nodes (4): /api/profile, /api/semesters, profiles, Settings

### Community 4 - "Database Schema"
Cohesion: 0.67
Nodes (3): /api/tasks, Tasks, tasks

## Knowledge Gaps
- **158 isolated node(s):** `AuthLayout`, `AuthLoading`, `AuthPage`, `Page`, `Page` (+153 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **135 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `class_instances` connect `Community 1` to `Community 2`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Why does `subjects` connect `Community 2` to `Community 1`, `Community 4`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **Why does `recurring_classes` connect `Community 2` to `Community 1`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **What connects `AuthLayout`, `AuthLoading`, `AuthPage` to the rest of the system?**
  _158 weakly-connected nodes found - possible documentation gaps or missing edges._