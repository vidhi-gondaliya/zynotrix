# ZYNOTRIX — Brand Guidelines

## Brand Name

**ZYNOTRIX** — always spelled in all-caps. Never written as "Zynotrix", "zynotrix", or "ZynoTrix".

The name has no explicit meaning but conveys:
- "Z" prefix: cutting-edge, next-generation
- "trix" suffix: tricks, tools, matrix (implies toolbox / intelligence)
- Combined: a smart, modern workspace tool

---

## Brand Personality

ZYNOTRIX is:

| Trait | What It Means |
|-------|---------------|
| **Precise** | Every element is intentional. No visual noise. |
| **Confident** | Bold typography, high contrast, decisive design choices |
| **Intelligent** | AI-first positioning — the product thinks alongside you |
| **Premium** | Dark glass aesthetics, gradient accents, glow effects |
| **Efficient** | Dense information without clutter — respects the user's time |

ZYNOTRIX is NOT:
- Playful (no cartoons, no emoji-heavy UI)
- Corporate-bland (no blue+white SaaS generic)
- Overwhelming (no feature-dumping, no popups)

---

## Brand Voice

### Tone Dimensions

| Dimension | Description |
|-----------|-------------|
| **Direct** | Short sentences. Get to the point. Avoid "in order to", "please note that" |
| **Human** | Friendly but not casual — like a smart colleague, not a chatbot |
| **Confident** | No hedging. "Your task was assigned" not "It seems like a task may have been assigned" |
| **Encouraging** | Celebrate progress. "All caught up!" not "No outstanding tasks" |

### Voice Examples

| Context | Weak | Strong (ZYNOTRIX) |
|---------|------|-------------------|
| Empty state | "There are no tasks to display" | "No tasks yet — add one to get started" |
| Success toast | "The operation was completed successfully" | "Task created" |
| Error message | "An error has occurred" | "Something went wrong. Try again." |
| AI insight | "Based on the data provided, it appears..." | "3 tasks are overdue — address these first." |
| Loading | "Please wait while we load your data" | [Skeleton UI — no text needed] |

---

## Logo Usage

**[MISSING — No logo file found in the repository]**

The application favicon is a default Next.js favicon. A proper brand mark is needed.

### Recommended Logo Treatment

Given the "Obsidian Command" aesthetic, the ideal logo should be:
- Wordmark: "ZYNOTRIX" in Plus Jakarta Sans ExtraBold, tracked wide
- Monogram: "Z" lettermark in an hexagonal or rhombus container with indigo-amber gradient fill
- Not: abstract geometric shapes that are generic

### Current Header

The sidebar shows "ZYNOTRIX" as a bold text wordmark in the brand font. This is the current logo treatment.

---

## Color Personality

| Color | Meaning | When to Use |
|-------|---------|-------------|
| **Slate Indigo** (#4F52D9 light / #818CF8 dark) | Intelligence, precision, trust | Primary actions, active states, links |
| **Warm Amber** (#E99B14 light / #FBBF24 dark) | Energy, momentum, urgency | In-progress states, streaks, overdue alerts |
| **Success Green** (#16A34A light / #22C55E dark) | Completion, achievement, health | Done states, positive metrics, badges |
| **Danger Rose** (#DC2626 light / #F43F5E dark) | Risk, error, critical | Overdue, errors, delete actions |
| **Navy Black** (#06070F) | Premium, depth, focus | Dark mode base |

---

## Typography Personality

- **Plus Jakarta Sans** for headings: Bold, geometric, modern — signals confidence
- **DM Sans** for body: Warm, legible at small sizes — signals approachability
- **JetBrains Mono** for code/data: Technical precision — signals developer trust

---

## Brand Don'ts

1. Never use the accent color (#818CF8) as background for body text — contrast insufficient at full opacity
2. Never mix the amber energy color with the danger color in the same component — creates visual confusion
3. Never use rounded-full on large containers (pill shape only for tags/badges, not cards)
4. Never clip content with `overflow: hidden` without providing a scroll escape
5. Never use animation durations above 400ms for interactive elements (feels sluggish)
6. Never show raw JSON or API errors to end users

---

## Brand Application Checklist

Before shipping a new screen or component, verify:

- [ ] Typography uses the correct font family (headings = Jakarta, body = DM Sans)
- [ ] Colors use CSS variables, not hardcoded hex values
- [ ] Dark mode is tested and working
- [ ] Interactive elements have hover AND focus states
- [ ] Loading states use skeleton loaders (not spinners for large areas)
- [ ] Empty states have an icon + heading + supporting text + primary action
- [ ] Error states have a human-readable message + recovery action
- [ ] Buttons use `.btn-primary`, `.btn-ghost`, or `.btn-danger` classes
