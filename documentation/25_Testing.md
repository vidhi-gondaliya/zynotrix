# ZYNOTRIX — Testing

## Current Test Coverage

**Test Coverage**: 0%

There are no automated tests of any kind in the ZYNOTRIX codebase:
- No unit tests
- No integration tests
- No end-to-end tests
- No test configuration files (`jest.config.js`, `vitest.config.ts`, `playwright.config.ts`)
- No test scripts in `package.json` beyond the default Next.js `test` stub

This is a critical gap for a production SaaS application. Bugs discovered in production by users are the only quality signal currently.

---

## Risk Assessment Without Tests

| Area | Risk Level | Reason |
|------|-----------|--------|
| Multi-tenant data isolation | CRITICAL | No test verifies org A cannot read org B's data |
| Permission system | HIGH | RBAC logic has no coverage — privilege escalation possible |
| Authentication flows | HIGH | Login, session, token bugs affect all users |
| Reward calculations | MEDIUM | Point math bugs could cause user frustration |
| API route contracts | MEDIUM | Breaking API changes undetected until frontend breaks |
| Kanban drag-drop | MEDIUM | Position conflicts accumulate without detection |
| AI integration | LOW | External service — mock-test the integration layer |

---

## Recommended Testing Strategy

### Layer 1: Unit Tests (Start Here)

Test pure business logic functions that don't need DB or network.

**Priority targets**:

```typescript
// src/lib/permissions.ts
describe("hasPermission", () => {
  it("OWNER has all permissions", () => {
    expect(hasPermission("OWNER", "admin:access")).toBe(true);
  });
  it("MEMBER cannot delete tasks", () => {
    expect(hasPermission("MEMBER", "tasks:delete")).toBe(false);
  });
});

// src/lib/notifications.ts (DND calculation)
describe("isInDND", () => {
  it("detects DND during normal window", () => { ... });
  it("handles midnight-crossing DND window", () => { ... });
});

// Reward point calculation
describe("awardPoints", () => {
  it("does not award points if config not found", () => { ... });
});
```

**Tool**: Vitest (faster than Jest, native ESM support)

### Layer 2: Integration Tests (API Routes)

Test API routes with a real test database.

**Setup**:
```bash
# Create a separate Neon test database
DATABASE_URL_TEST="postgresql://...neon.tech/test_db"
```

**Priority routes**:

```typescript
// Test org isolation
describe("GET /api/tasks", () => {
  it("returns only tasks from the requester's org", async () => {
    // Create tasks in org A and org B
    // Authenticate as org A user
    // Verify only org A tasks returned
  });
});

// Test RBAC
describe("DELETE /api/projects/:id", () => {
  it("allows ADMIN to delete project", async () => { ... });
  it("denies MEMBER from deleting project", async () => {
    // Expect 403
  });
});
```

**Tool**: Vitest + `node-fetch` or Next.js test utilities

### Layer 3: End-to-End Tests (Critical Flows)

Test the full user journey through the browser.

**Critical paths to cover**:

1. **Registration → Onboarding → First task**
2. **Login → Dashboard → Create project → Add task → Move to done**
3. **Admin creates user → User logs in with correct role**
4. **Notification preference → Task assignment → SSE notification appears**

**Tool**: Playwright

```typescript
// tests/e2e/task-lifecycle.spec.ts
test("user can create and complete a task", async ({ page }) => {
  await page.goto("/login");
  await page.fill("[name=email]", "test@example.com");
  await page.fill("[name=password]", "password123");
  await page.click("button[type=submit]");
  await expect(page).toHaveURL("/dashboard");
  
  await page.goto("/projects/test-project/board");
  await page.click("text=New Task");
  await page.fill("[name=title]", "My E2E Test Task");
  await page.click("button:has-text('Create')");
  await expect(page.locator("text=My E2E Test Task")).toBeVisible();
});
```

---

## Test Environment Setup

### Install Testing Dependencies

```bash
npm install -D vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom
npm install -D playwright @playwright/test
```

### Vitest Configuration

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    coverage: {
      reporter: ["text", "html"],
      exclude: ["node_modules/", ".next/"],
    },
  },
});
```

### Add Test Scripts to package.json

```json
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage",
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui"
}
```

---

## Mocking Strategy

### Prisma Mock

```typescript
// tests/__mocks__/prisma.ts
import { PrismaClient } from "@prisma/client";
import { mockDeep, mockReset, DeepMockProxy } from "vitest-mock-extended";

export const prismaMock = mockDeep<PrismaClient>();

beforeEach(() => {
  mockReset(prismaMock);
});
```

### NextAuth Mock

```typescript
// Mock session for protected route tests
vi.mock("next-auth", () => ({
  auth: vi.fn().mockResolvedValue({
    user: {
      id: "user-1",
      organizationId: "org-1",
      orgRole: "ADMIN",
    }
  })
}));
```

### Anthropic SDK Mock

```typescript
vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      stream: vi.fn().mockReturnValue({
        finalText: vi.fn().mockResolvedValue("Mocked AI response")
      })
    }
  }))
}));
```

---

## CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "20" }
      - run: npm ci
      - run: npm test

  e2e:
    runs-on: ubuntu-latest
    env:
      DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
      NEXTAUTH_SECRET: test-secret-for-ci
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run build
      - run: npm run test:e2e
```

---

## Test Coverage Targets

For initial test implementation:

| Area | Target Coverage |
|------|----------------|
| `src/lib/permissions.ts` | 100% |
| `src/lib/notifications.ts` (DND logic) | 90% |
| `src/lib/org.ts` | 80% |
| API route `/api/tasks/*` | 70% |
| API route `/api/projects/*` | 70% |
| UI components | 30% (focus on forms) |

---

## Testing Priority Order

1. **Week 1**: Set up Vitest, write unit tests for `permissions.ts` and DND logic in `notifications.ts`
2. **Week 2**: Integration tests for multi-tenant isolation (most critical security test)
3. **Week 3**: Integration tests for RBAC on mutation routes
4. **Week 4**: Set up Playwright, write E2E for login + task creation flow
5. **Ongoing**: Test every new feature before shipping
