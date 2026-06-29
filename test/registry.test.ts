import { describe, it, expect, beforeAll } from "vitest";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

type Skill = { dir: string; fileName?: string; getTemplate: () => string };

let ALL_SKILLS: Skill[];
let generateManifestContent: (basePath: string, format: "markdown" | "mdc") => string;

beforeAll(async () => {
    const distSkills = fileURLToPath(new URL("../dist/skills.js", import.meta.url));
    if (!existsSync(distSkills)) {
        throw new Error("dist/ not found — run `npm run build` before `npm test`.");
    }
    ({ ALL_SKILLS } = (await import("../dist/skills.js")) as { ALL_SKILLS: Skill[] });
    ({ generateManifestContent } = (await import("../dist/templates/manifest.js")) as {
        generateManifestContent: (basePath: string, format: "markdown" | "mdc") => string;
    });
});

describe("skill registry (ALL_SKILLS)", () => {
    it("every registered skill resolves to non-empty content", () => {
        const broken: string[] = [];
        for (const skill of ALL_SKILLS) {
            try {
                const content = skill.getTemplate();
                if (!content || !content.trim()) broken.push(`${skill.dir} (empty)`);
            } catch (e) {
                broken.push(`${skill.dir} (threw: ${(e as Error).message})`);
            }
        }
        expect(broken, "these registered skills failed to load").toEqual([]);
    });

    it("every installed SKILL.md is listed in the manifest Skill Map", () => {
        const manifest = generateManifestContent("skills", "markdown");
        const skillDirs = ALL_SKILLS
            .filter((s) => (s.fileName ?? "SKILL.md") === "SKILL.md")
            .map((s) => s.dir);
        const missing = skillDirs.filter((d) => !manifest.includes(`skills/${d}/SKILL.md`));
        expect(missing, "skills missing from the manifest.ts Skill Map").toEqual([]);
    });
});
