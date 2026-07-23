import { createHmac } from "crypto";

export function verifyGitHubSignature(body: string, signature: string, secret: string): boolean {
  if (!signature || !secret) return false;
  const expected = "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
  // Constant-time comparison
  if (expected.length !== signature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return mismatch === 0;
}

export interface GitHubPREvent {
  action: "opened" | "closed" | "reopened" | "synchronize" | "merged";
  pull_request: {
    number: number;
    title: string;
    html_url: string;
    state: "open" | "closed";
    merged: boolean;
    body: string | null;
    head: { ref: string };
    base: { ref: string };
    user: { login: string };
  };
  repository: { full_name: string; html_url: string };
}

// Extract ZYNOTRIX task IDs from PR title, body, and branch name.
// Supports:
//   - "ZYN-<cuid>" anywhere in title/body/branch (e.g. "fix/ZYN-cm1abc…-my-feature")
//   - Bare cuids (c + 24 alphanumeric chars) in title/body
//   - "Closes #ZYN-<id>", "Fixes ZYN-<id>" — captured by the ZYN- pattern
export function extractTaskRefs(pr: Pick<GitHubPREvent["pull_request"], "title" | "body" | "head">): string[] {
  // Include branch name as an additional source of task refs
  const branchName = pr.head?.ref ?? "";
  const text = `${pr.title} ${pr.body ?? ""} ${branchName}`;
  const refs = new Set<string>();

  // Match ZYN-<cuid> pattern
  const zynPattern = /ZYN-([a-z0-9]{20,30})/gi;
  let m: RegExpExecArray | null;
  while ((m = zynPattern.exec(text)) !== null) refs.add(m[1]);

  // Match raw cuids (starts with c, 25 chars) — only in title/body, not branch
  const titleBody = `${pr.title} ${pr.body ?? ""}`;
  const cuidPattern = /\b(c[a-z0-9]{24})\b/g;
  while ((m = cuidPattern.exec(titleBody)) !== null) refs.add(m[1]);

  return Array.from(refs);
}

export function prToTaskStatus(pr: GitHubPREvent["pull_request"]): "open" | "merged" | "closed" {
  if (pr.merged) return "merged";
  if (pr.state === "closed") return "closed";
  return "open";
}
