// Natural language task parser — no AI required for instant feedback
import { addDays, nextFriday, nextMonday, startOfTomorrow, startOfToday, parseISO, isValid, format } from "date-fns";

export interface ParsedTask {
  title: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  dueDate: string | null;
  assigneeName: string | null;
  tags: string[];
  projectHint: string | null;
}

const PRIORITY_WORDS: Record<string, ParsedTask["priority"]> = {
  "!urgent": "URGENT", "!u": "URGENT", "!!!": "URGENT",
  "!high": "HIGH",     "!h": "HIGH",   "!!": "HIGH",
  "!medium": "MEDIUM", "!m": "MEDIUM", "!": "MEDIUM",
  "!low": "LOW",       "!l": "LOW",
  "p1": "URGENT", "p2": "HIGH", "p3": "MEDIUM", "p4": "LOW",
  "urgent": "URGENT", "asap": "URGENT", "critical": "URGENT",
  "high priority": "HIGH", "important": "HIGH",
};

const DATE_PATTERNS: { pattern: RegExp; resolve: () => Date }[] = [
  { pattern: /\btoday\b/i,        resolve: () => startOfToday() },
  { pattern: /\btomorrow\b/i,     resolve: () => startOfTomorrow() },
  { pattern: /\bmonday\b/i,       resolve: () => nextMonday(new Date()) },
  { pattern: /\bfriday\b/i,       resolve: () => nextFriday(new Date()) },
  { pattern: /\bthis\s+week\b/i,  resolve: () => nextFriday(new Date()) },
  { pattern: /\bnext\s+week\b/i,  resolve: () => addDays(nextMonday(new Date()), 7) },
  { pattern: /\bin\s+(\d+)\s+days?\b/i, resolve: () => new Date() }, // handled separately
  { pattern: /\bby\s+(\w+)\b/i,   resolve: () => new Date() },       // handled separately
];

export function parseTask(input: string): ParsedTask {
  let text = input.trim();
  let priority: ParsedTask["priority"] = "MEDIUM";
  let dueDate: string | null = null;
  let assigneeName: string | null = null;
  let tags: string[] = [];
  let projectHint: string | null = null;

  // Extract @assignee
  const atMatch = text.match(/@([\w.]+)/);
  if (atMatch) { assigneeName = atMatch[1]; text = text.replace(atMatch[0], "").trim(); }

  // Extract #tag or #project
  const hashMatches = Array.from(text.matchAll(/#([\w-]+)/g));
  if (hashMatches.length > 0) {
    tags = hashMatches.map((m) => m[1]);
    projectHint = hashMatches[0][1];
    text = text.replace(/#[\w-]+/g, "").trim();
  }

  // Extract priority — check !-prefixed tokens first (no word boundary needed for punctuation)
  const bangTokens = ["!urgent","!u","!!!","!high","!h","!!","!medium","!m","!low","!l","!"] as const;
  let priorityFound = false;
  for (const word of bangTokens) {
    const escaped = word.replace(/!/g, "\\!");
    const re = new RegExp(`(?:^|\\s)${escaped}(?=\\s|$)`, "i");
    if (re.test(text)) {
      priority = PRIORITY_WORDS[word];
      text = text.replace(re, " ").trim();
      priorityFound = true;
      break;
    }
  }
  if (!priorityFound) {
    const wordTokens = ["p1","p2","p3","p4","urgent","asap","critical","high priority","important"] as const;
    for (const word of wordTokens) {
      const re = new RegExp(`\\b${word}\\b`, "i");
      if (re.test(text)) { priority = PRIORITY_WORDS[word]; text = text.replace(re, "").trim(); break; }
    }
  }

  // Extract "in N days"
  const inDaysMatch = text.match(/\bin\s+(\d+)\s+days?\b/i);
  if (inDaysMatch) {
    dueDate = format(addDays(new Date(), parseInt(inDaysMatch[1])), "yyyy-MM-dd");
    text = text.replace(inDaysMatch[0], "").trim();
  }

  // Extract "by [date]" or "due [date]"
  const byMatch = text.match(/\b(?:by|due|before)\s+([\w\s,]+?)(?:\s+!|\s+#|\s+@|$)/i);
  if (byMatch && !dueDate) {
    const dateStr = byMatch[1].trim();
    const knownDates: Record<string, () => Date> = {
      today:     () => startOfToday(),
      tomorrow:  () => startOfTomorrow(),
      monday:    () => nextMonday(new Date()),
      friday:    () => nextFriday(new Date()),
      "next week": () => addDays(nextMonday(new Date()), 7),
    };
    const resolved = knownDates[dateStr.toLowerCase()];
    if (resolved) { dueDate = format(resolved(), "yyyy-MM-dd"); text = text.replace(byMatch[0], "").trim(); }
    else {
      try { const parsed = parseISO(dateStr); if (isValid(parsed)) { dueDate = format(parsed, "yyyy-MM-dd"); text = text.replace(byMatch[0], "").trim(); } } catch {}
    }
  }

  // Natural date patterns (if no "by" found)
  if (!dueDate) {
    for (const { pattern, resolve } of DATE_PATTERNS.slice(0, 6)) {
      if (pattern.test(text)) {
        dueDate = format(resolve(), "yyyy-MM-dd");
        text = text.replace(pattern, "").trim();
        break;
      }
    }
  }

  // Clean up extra spaces / punctuation
  text = text.replace(/\s{2,}/g, " ").replace(/[,.]$/,"").trim();

  return { title: text || "New Task", priority, dueDate, assigneeName, tags, projectHint };
}
