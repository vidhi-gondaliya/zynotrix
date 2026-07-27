# ZYNOTRIX — State Management

ZYNOTRIX uses no Redux, no React Query, no Apollo. State management is deliberately minimal and layered.

---

## State Categories

### 1. Server State (Data Fetching)

**Pattern**: `useEffect` + `useState`

All server data is fetched with plain `fetch()` inside `useEffect` hooks:

```typescript
const [data, setData] = useState<ProjectData | null>(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
  fetch("/api/projects")
    .then(r => r.json())
    .then(setData)
    .catch(() => {})
    .finally(() => setLoading(false));
}, []);
```

**Characteristics**:
- No caching between page navigations (data re-fetched on every mount)
- No optimistic updates (UI waits for server confirmation)
- No automatic background refetching
- No deduplication of identical requests

**Trade-offs**:
- Simple and predictable
- More network requests than necessary
- No stale-while-revalidate behavior

**Recommended improvement**: Add SWR or React Query for caching, deduplication, and background refetch. This would reduce perceived latency significantly for frequently accessed data like the dashboard.

---

### 2. Auth State

**Pattern**: NextAuth `useSession()` hook

```typescript
const { data: session } = useSession();
const userId = session?.user?.id;
const orgRole = session?.user?.orgRole;
```

**Scope**: Available to any Client Component wrapped in `SessionProvider` (root layout).

**Session refresh**: Handled automatically by NextAuth via periodic JWT revalidation. Manual update via `update()` when org changes.

**Server-side auth**: `auth()` from `src/lib/auth.ts` — called in API routes and middleware.

---

### 3. UI State (Local)

**Pattern**: `useState` in component

For component-specific UI: modal open/close, form field values, tab selection, loading indicators.

```typescript
const [open, setOpen] = useState(false);
const [tab, setTab] = useState<"users" | "roles">("users");
const [saving, setSaving] = useState(false);
```

This is the most common state pattern in the codebase. Each page component manages its own UI state independently.

---

### 4. Form State

**Pattern**: Mix of `useState` and `react-hook-form`

Simple forms (most of the app):
```typescript
const [form, setForm] = useState({ name: "", email: "", role: "MEMBER" });
// onChange: setForm({ ...form, fieldName: value })
```

Complex forms with validation:
```typescript
const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(schema)
});
```

**Inconsistency**: Not all forms use react-hook-form. The codebase has both patterns — some complex forms like "New Project" or "New Meeting" may use react-hook-form while admin forms use plain useState.

---

### 5. Global UI State (Zustand)

Three Zustand stores are used for cross-component global state:

#### `useTheme` Store (`src/store/useTheme.ts`)

```typescript
interface ThemeStore {
  theme: "light" | "dark";
  sidebarCollapsed: boolean;
  setTheme: (theme: "light" | "dark") => void;
  toggleTheme: () => void;
  setSidebarCollapsed: (v: boolean) => void;
}
```

**Persisted**: Theme preference stored in `localStorage`.  
**Used by**: `ThemeToggle`, `ThemeInit`, `Sidebar`, App layout.

#### `useNotifications` Store (`src/store/useNotifications.ts`)

```typescript
interface NotificationStore {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (n: Notification) => void;
  markAllRead: () => void;
  setNotifications: (ns: Notification[]) => void;
}
```

**Used by**: `NotificationBell`, `NotificationProvider`.  
**Updated by**: SSE messages from `/api/notifications/sse`.

#### `useChat` Store (`src/store/useChat.ts`)

```typescript
interface ChatStore {
  messages: Record<string, Message[]>;   // keyed by channelId
  addMessage: (channelId: string, message: Message) => void;
  setMessages: (channelId: string, messages: Message[]) => void;
}
```

**Used by**: Chat page, SSE hook.

---

### 6. Real-time State (SSE)

**Pattern**: Custom `useSSE` hook + Zustand stores

```typescript
// src/hooks/useSSE.ts
export function useSSE(url: string, onMessage: (data: unknown) => void) {
  useEffect(() => {
    const es = new EventSource(url);
    es.onmessage = (e) => onMessage(JSON.parse(e.data));
    es.onerror = () => es.close();
    return () => es.close();
  }, [url]);
}
```

**Used in**:
- Notification bell: SSE → `addNotification()` → Zustand store → UI updates
- Chat rooms: SSE → `addMessage()` → local state → UI updates
- DM conversations: Same pattern with DM SSE endpoint

---

### 7. AI Streaming State

**Pattern**: Custom `useClaude` hook (`src/hooks/useClaude.ts`)

```typescript
export function useClaude() {
  const [text, setText] = useState("");
  const [streaming, setStreaming] = useState(false);

  const ask = async (url: string, body: object) => {
    setStreaming(true);
    setText("");
    const res = await fetch(url, { method: "POST", body: JSON.stringify(body) });
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      setText(prev => prev + decoder.decode(value));
    }
    setStreaming(false);
    return text;
  };

  return { ask, text, streaming };
}
```

**Used in**: Dashboard AI Insights, AI Assistant page, AI Reports, StandupWidget.

---

## State Flow Diagram

```
User Action
    │
    ▼
React Event Handler
    │
    ├─── Local useState update (immediate UI feedback)
    │
    └─── API Fetch
              │
              ├─── [Success] setData(response)
              │                    │
              │                    └─── React re-renders component
              │
              └─── [Error] setError(message) or toast.error()

Server-side Event (SSE)
    │
    ▼
EventSource.onmessage
    │
    └─── Zustand store update (addNotification / addMessage)
              │
              └─── All subscribers re-render
```

---

## State Persistence

| State | Persistence |
|-------|-------------|
| Theme preference | `localStorage("theme")` |
| Onboarding status | `localStorage("zynotrix_onboarded")` |
| Auth session | HttpOnly cookie (JWT) — managed by NextAuth |
| App data | None — refetched on each page load |
| SSE connections | In-memory — lost on browser refresh |

---

## Known State Issues

1. **No optimistic updates**: Every mutation waits for server round-trip. On slow connections, the UI freezes briefly.

2. **No request deduplication**: If multiple components fetch `/api/projects` simultaneously, multiple network requests fire.

3. **No error boundary state**: Failed API calls silently return empty data in most cases (the `catch(() => {})` pattern swallows errors).

4. **Stale data after navigation**: Going back to a page shows the previous data briefly before re-fetching. No stale-while-revalidate.

5. **Form state not reset on modal close**: Some modals leave form data populated if reopened without submission.

---

## Recommendations

1. **Add React Query (TanStack Query)**: Replace `useEffect`+`useState` data fetching with query hooks for caching, background refetch, and optimistic mutations.

2. **Add error state**: Every data fetch should have a corresponding error state shown to users.

3. **Consistent form management**: Standardize on react-hook-form for all forms.

4. **Add Zustand persistence middleware**: Persist more user preferences (sidebar state, last visited project) via `zustand/middleware/persist`.
