import type { BoardColumnConfig, BoardConfig } from "@/types";

export const DEFAULT_COLUMNS: BoardColumnConfig[] = [
  { id: "BACKLOG",     label: "Backlog",      color: "#6B7280", group: "progress" },
  { id: "TODO",        label: "To Do",        color: "#60A5FA", group: "progress" },
  { id: "IN_PROGRESS", label: "In Progress",  color: "#A78BFA", group: "progress" },
  { id: "REVIEW",      label: "In Review",    color: "#FBBF24", group: "done"     },
  { id: "DONE",        label: "Completed",    color: "#34D399", group: "done"     },
  { id: "ARCHIVED",    label: "Archived",     color: "#475569", group: "done"     },
];

// The "done" columns that always appear at the right of every template
export const DONE_COLUMNS: BoardColumnConfig[] = [
  { id: "REVIEW",   label: "In Review",  color: "#FBBF24", group: "done" },
  { id: "DONE",     label: "Completed",  color: "#34D399", group: "done" },
  { id: "ARCHIVED", label: "Archived",   color: "#475569", group: "done" },
];

export interface BoardTemplate {
  id: string;
  name: string;
  description: string;
  emoji: string;
  columns: BoardColumnConfig[];
}

export const BOARD_TEMPLATES: BoardTemplate[] = [
  {
    id: "simple",
    name: "Simple",
    description: "A clean 3-stage flow for any project",
    emoji: "📋",
    columns: [
      { id: "BACKLOG",     label: "Backlog",     color: "#6B7280", group: "progress" },
      { id: "TODO",        label: "To Do",       color: "#60A5FA", group: "progress" },
      { id: "IN_PROGRESS", label: "In Progress", color: "#A78BFA", group: "progress" },
      ...DONE_COLUMNS,
    ],
  },
  {
    id: "development",
    name: "Development",
    description: "Engineering workflow with planning & testing phases",
    emoji: "💻",
    columns: [
      { id: "TODO",        label: "To Do",       color: "#60A5FA", group: "progress" },
      { id: "PLANNING",    label: "Planning",    color: "#818CF8", group: "progress" },
      { id: "IN_PROGRESS", label: "Development", color: "#A78BFA", group: "progress" },
      { id: "TESTING",     label: "Testing",     color: "#FB923C", group: "progress" },
      ...DONE_COLUMNS,
    ],
  },
  {
    id: "marketing",
    name: "Marketing",
    description: "Content and campaign management pipeline",
    emoji: "📣",
    columns: [
      { id: "TODO",             label: "To Do",           color: "#60A5FA", group: "progress" },
      { id: "CONTENT_CREATION", label: "Content Creation",color: "#C084FC", group: "progress" },
      { id: "DESIGN",           label: "Design",          color: "#A78BFA", group: "progress" },
      { id: "APPROVAL",         label: "Approval",        color: "#FB923C", group: "progress" },
      ...DONE_COLUMNS,
    ],
  },
  {
    id: "agile",
    name: "Agile Sprint",
    description: "Scrum-based sprint planning and execution",
    emoji: "🔄",
    columns: [
      { id: "BACKLOG",     label: "Product Backlog", color: "#6B7280", group: "progress" },
      { id: "TODO",        label: "Sprint Backlog",  color: "#60A5FA", group: "progress" },
      { id: "IN_PROGRESS", label: "In Progress",     color: "#A78BFA", group: "progress" },
      ...DONE_COLUMNS,
    ],
  },
  {
    id: "design",
    name: "Design",
    description: "UI/UX and creative production workflow",
    emoji: "🎨",
    columns: [
      { id: "TODO",        label: "To Do",    color: "#60A5FA", group: "progress" },
      { id: "DESIGN",      label: "Design",   color: "#A78BFA", group: "progress" },
      { id: "IN_PROGRESS", label: "Revisions",color: "#818CF8", group: "progress" },
      ...DONE_COLUMNS,
    ],
  },
];

export function getBoardColumns(boardConfigJson: string | null | undefined): BoardColumnConfig[] {
  if (!boardConfigJson) return DEFAULT_COLUMNS;
  try {
    const config: BoardConfig = JSON.parse(boardConfigJson);
    return config.columns ?? DEFAULT_COLUMNS;
  } catch {
    return DEFAULT_COLUMNS;
  }
}

export const COLOR_PALETTE = [
  "#6B7280", "#60A5FA", "#818CF8", "#A78BFA", "#C084FC",
  "#E879F9", "#F472B6", "#FB923C", "#FBBF24", "#34D399",
  "#22D3EE", "#F87171",
];
