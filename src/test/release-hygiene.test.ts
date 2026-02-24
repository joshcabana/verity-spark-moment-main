// @vitest-environment node

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readRepoFile = (relativePath: string): string => {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
};

describe("release hygiene", () => {
  it("keeps npm lockfile as source of truth for CI", () => {
    const ci = readRepoFile(".github/workflows/ci.yml");

    expect(ci).toContain("npm ci");
    expect(existsSync(resolve(process.cwd(), "package-lock.json"))).toBe(true);
    expect(existsSync(resolve(process.cwd(), "bun.lockb"))).toBe(false);
  });

  it("does not reference removed 192 icon assets", () => {
    const indexHtml = readRepoFile("index.html");
    const manifest = readRepoFile("public/manifest.json");
    const serviceWorker = readRepoFile("public/sw.js");

    expect(indexHtml).not.toContain("verity-icon-192.png");
    expect(manifest).not.toContain("verity-icon-192.png");
    expect(serviceWorker).not.toContain("verity-icon-192.png");
  });

  it("keeps local worktree artifacts out of lint and git noise", () => {
    const eslintConfig = readRepoFile("eslint.config.js");
    const gitignore = readRepoFile(".gitignore");

    expect(eslintConfig).toContain(".claude/**");
    expect(gitignore).toContain(".claude/worktrees/");
  });

  it("uses canonical appeal statuses in admin actions", () => {
    const adminPage = readRepoFile("src/pages/Admin.tsx");
    const adminFunction = readRepoFile("supabase/functions/admin-moderation/index.ts");

    expect(adminPage).toContain('outcome: "overturned"');
    expect(adminPage).toContain('outcome: "upheld"');
    expect(adminFunction).toContain("normalizeAppealOutcome");
    expect(adminFunction).toContain('"overturned"');
    expect(adminFunction).toContain('"upheld"');
  });
});
