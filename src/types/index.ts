export type UserRole = "OWNER" | "ADMIN" | "MANAGER" | "MEMBER";
export type ProjectStatus = "PLANNING" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "ARCHIVED";
export type TaskStatus = "BACKLOG" | "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE" | "ARCHIVED";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type MeetingStatus = "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type RSVP = "PENDING" | "ACCEPTED" | "DECLINED";
export type MessageType = "TEXT" | "FILE" | "SYSTEM" | "AI";
export type NotificationType =
  | "TASK_ASSIGNED"
  | "TASK_DUE"
  | "TASK_OVERDUE"
  | "COMMENT_ADDED"
  | "MEETING_REMINDER"
  | "MEETING_INVITE"
  | "HEALTH_ALERT"
  | "MENTION"
  | "SYSTEM";
export type SourceType = "MESSAGE" | "DOCUMENT" | "MEETING" | "TASK";

export interface User {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  role: UserRole;
  createdAt: string;
}

export interface BoardColumnConfig {
  id: string;
  label: string;
  color: string;
  group: "progress" | "done";
}

export interface BoardConfig {
  templateId: string;
  columns: BoardColumnConfig[];
}

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  status: ProjectStatus;
  color: string;
  icon?: string | null;
  deadline?: string | null;
  budget?: number | null;
  clientName?: string | null;
  clientEmail?: string | null;
  healthScore?: number | null;
  healthData?: string | null;
  boardConfig?: string | null;
  ownerId: string;
  owner?: User;
  createdAt: string;
  updatedAt: string;
  _count?: { tasks: number };
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  position: number;
  parentTaskId?: string | null;
  assigneeId?: string | null;
  creatorId: string;
  dueDate?: string | null;
  estimatedHours?: number | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  assignee?: User | null;
  creator?: User;
  project?: Project;
  _count?: { comments: number };
}

export interface Comment {
  id: string;
  taskId: string;
  authorId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: User;
}

export interface ChannelMemberUser {
  id: string; name: string | null; image: string | null;
}
export interface ChannelMember {
  channelId: string; userId: string; joinedAt: string;
  user: ChannelMemberUser;
}
export interface Channel {
  id: string;
  name: string;
  description?: string | null;
  isGeneral: boolean;
  isPrivate: boolean;
  createdAt: string;
  _count?: { messages: number; members: number };
  members?: ChannelMember[];
}

export interface Message {
  id: string;
  channelId: string;
  authorId: string;
  content: string;
  type: MessageType;
  metadata?: string | null;
  createdAt: string;
  author: User;
}

export interface Meeting {
  id: string;
  title: string;
  description?: string | null;
  startTime: string;
  endTime: string;
  googleMeetUrl?: string | null;
  googleEventId?: string | null;
  status: MeetingStatus;
  notes?: string | null;
  actionItems?: string | null;
  projectId?: string | null;
  organizerId: string;
  createdAt: string;
  organizer?: User;
  project?: Project | null;
  attendees?: MeetingAttendee[];
}

export interface MeetingAttendee {
  meetingId: string;
  userId: string;
  rsvp: RSVP;
  user: User;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  data?: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface Document {
  id: string;
  title: string;
  content: string;
  projectId?: string | null;
  authorId: string;
  createdAt: string;
  updatedAt: string;
  author?: User;
  project?: Project | null;
}

export interface AnalyticsData {
  totalProjects: number;
  activeProjects: number;
  activeTasks: number;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  completionRate: number;
  reviewTasks: number;
  tasksByStatus: Record<TaskStatus, number>;
  tasksByPriority: Record<TaskPriority, number>;
  taskTrend: { date: string; completed: number; created: number }[];
  teamActivity: { name: string; tasks: number }[];
  projectHealth: { name: string; score: number; color: string }[];
  upcomingMeetings: Meeting[];
  recentTasks: Task[];
  insightCount?: number;
  alerts?: import("@/app/api/alerts/route").RiskAlert[];
  criticalAlertCount?: number;
}

export interface HealthAnalysis {
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  summary: string;
  breakdown: {
    onTimeRate: number;
    budgetStatus: "on_track" | "at_risk" | "over_budget";
    teamVelocity: number;
    blockerCount: number;
    completionRate: number;
  };
  risks: string[];
  recommendations: string[];
}

export interface SearchResult {
  sourceType: SourceType;
  sourceId: string;
  content: string;
  projectId?: string | null;
  relevanceScore: number;
  title: string;
  url: string;
  createdAt: string;
}

export interface KanbanColumn {
  status: TaskStatus;
  label: string;
  color: string;
  tasks: Task[];
}

export type Theme = "light" | "dark";
