# ZYNOTRIX — Icons

## Icon Library

**Library**: `lucide-react@^1.17.0`  
**Total Available**: 1,300+ icons  
**Usage Pattern**: Named imports per file (tree-shaken at build time)

```typescript
import { Sparkles, X, Send } from "lucide-react";
```

No default icon size — size is set via Tailwind classes: `className="w-4 h-4"`, `"w-5 h-5"`, `"w-6 h-6"`.

---

## Icon Usage by Category

### Navigation & Layout
| Icon | Usage Location |
|------|---------------|
| `Menu` | Mobile hamburger menu toggle (Header) |
| `ChevronDown` | Dropdown indicators, collapsible sections |
| `ChevronLeft` / `ChevronRight` | Timeline navigation, back buttons |
| `ArrowLeft` | Back buttons (Project header, New Meeting) |
| `ArrowRight` | Forward navigation, action links |
| `Command` | Cmd/Ctrl+K keyboard shortcut indicator (Header) |
| `Search` | Search inputs (Header, Channel, List view, Templates, Messages) |
| `Settings` | Settings cog (Chat channel header, Sidebar) |
| `X` | Close modals, dismiss banners, clear inputs |
| `ExternalLink` | Open in new tab links |
| `Globe` | Public/external links (Project settings) |

### Project & Tasks
| Icon | Usage Location |
|------|---------------|
| `Kanban` | Project board tab label |
| `List` | Project list view tab |
| `GanttChartSquare` | Project timeline tab |
| `Zap` | Sprint tab, energy/AI indicators |
| `Plus` | Add task, add member, new channel, create buttons |
| `Trash2` | Delete actions (project settings, templates, admin) |
| `Archive` | Archive column actions (Kanban) |
| `Pencil` | Edit column name (Kanban) |
| `Check` | Confirm inline edit |
| `CornerDownLeft` | Submit/enter action (Kanban column rename) |
| `ChevronRight` | Context menu submenu indicator |
| `Layers` | Template layer indicator |
| `Palette` | Template color/theme |
| `Copy` | Duplicate template |
| `Save` | Save project settings |
| `SlidersHorizontal` | Filter controls (Kanban board) |
| `CheckSquare` | Subtask/checklist items |

### People & Users
| Icon | Usage Location |
|------|---------------|
| `User` | User placeholder icon, person indicators |
| `User2` | Alternate user icon (Board filters) |
| `Users` | Team/member groups |
| `UserPlus` | Invite/add member to channel |

### Status & Priority
| Icon | Usage Location |
|------|---------------|
| `AlertTriangle` | Warning states, overdue tasks, risk indicators |
| `AlertCircle` | Error states, blocked tasks |
| `CheckCircle` / `CheckCircle2` | Completed states |
| `XCircle` | Failed/rejected states (Attendance: absent) |
| `TrendingUp` | Positive metric trend |
| `TrendingDown` | Negative metric trend |
| `Minus` | Neutral/flat metric |
| `Clock` | Time indicators, deadlines, attendance |

### AI Features
| Icon | Usage Location |
|------|---------------|
| `Sparkles` | Primary AI indicator (AI Insights, Assistant, Search, NL task creator) |
| `Bot` | AI chat messages, AI assistant identity |
| `Wand2` | AI magic/generation actions (NL Task Creator) |
| `RefreshCw` | Regenerate AI content |
| `Send` | Submit chat/AI message |
| `Mic` / `MicOff` | Voice input toggle (NL Task Creator) |
| `Minimize2` | Collapse AI chat bubble |

### Communication
| Icon | Usage Location |
|------|---------------|
| `Bell` | Notification bell (Header) |
| `Hash` | Channel indicator (Chat list, channel header) |
| `Lock` | Private channels, locked features |
| `MessageSquare` | Comment/message count on task cards |
| `MessageCircle` | DM conversations list |
| `Smile` | Emoji picker button (Chat) |

### Meetings
| Icon | Usage Location |
|------|---------------|
| `Calendar` | Date fields, meeting calendar, timeline |
| `Video` | Video meeting indicator (New Meeting) |
| `Link2` | Meeting link (Google Meet URL) |
| `ArrowLeftRight` | Swap/compare (Board page) |

### Rewards & Gamification
| Icon | Usage Location |
|------|---------------|
| `Trophy` | Leaderboard, achievements |
| `Star` | Rating, featured items, AI standup |
| `Award` | Badge display |
| `Gift` | Coupon/reward icon |
| `Flame` | Streak indicator |
| `Crown` | Top-ranked user (Leaderboard) |

### Auth & Security
| Icon | Usage Location |
|------|---------------|
| `Mail` | Email input field (Login, Register) |
| `Lock` | Password input field (Login, Register) |
| `Eye` / `EyeOff` | Password show/hide toggle |
| `Shield` | Security/audit page header |

### Integrations & Import/Export
| Icon | Usage Location |
|------|---------------|
| `Wifi` | Connection status (Attendance SSE indicator) |
| `BarChart2` | Analytics, workload charts |
| `ClipboardCheck` | Attendance page header |
| `LogIn` / `LogOut` | Clock-in / Clock-out buttons |
| `Filter` | Filter controls (Audit log) |

### Misc
| Icon | Usage Location |
|------|---------------|
| `Loader2` | Loading spinners (spinning via Tailwind `animate-spin`) |

---

## Icon Sizing Conventions

| Size Class | Pixel Size | Usage |
|-----------|------------|-------|
| `w-3 h-3` | 12px | Inline with small text, badges |
| `w-4 h-4` | 16px | Default — most UI icons, buttons |
| `w-5 h-5` | 20px | Sidebar nav icons, header icons |
| `w-6 h-6` | 24px | Feature headers, empty states |
| `w-8 h-8` | 32px | Large feature indicators |
| `w-10 h-10` | 40px | Hero/splash icons |
| `w-12 h-12` | 48px | Reward cards, large status indicators |

---

## Accessibility Gap

All icon-only buttons (e.g., close modals `<X>`, theme toggle `<Sun>/<Moon>`, notification bell `<Bell>`) are missing `aria-label` attributes. Screen readers announce these as "button" with no context.

**Required fix for every icon-only button**:
```typescript
<button aria-label="Close modal">
  <X className="w-4 h-4" />
</button>

<button aria-label={`${unreadCount} unread notifications`}>
  <Bell className="w-5 h-5" />
</button>
```

See `23_Accessibility.md` for full accessibility audit.

---

## Icon Consistency Guidelines

1. Use `Sparkles` consistently for all AI-powered actions — never mix with `Bot`, `Star`, or `Wand2` for AI entry points
2. Use `Loader2` with `animate-spin` for all loading states (never `RefreshCw` for loading)
3. Use `X` for close/dismiss (never `XCircle` in buttons — reserve for status indicators)
4. Use `Plus` for all create/add actions (never `Add` — not in Lucide vocabulary)
5. Use `Trash2` for delete (never `Trash` — use the stroke variant consistently)
