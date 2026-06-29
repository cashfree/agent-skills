import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const TEMPLATES_DIR = fileURLToPath(new URL("../src/templates", import.meta.url));

function walkMarkdown(dir: string, acc: string[] = []): string[] {
    for (const entry of readdirSync(dir)) {
        const p = join(dir, entry);
        if (statSync(p).isDirectory()) walkMarkdown(p, acc);
        else if (entry.endsWith(".md")) acc.push(p);
    }
    return acc;
}

const cases = walkMarkdown(TEMPLATES_DIR).map((file) => ({
    file,
    name: relative(TEMPLATES_DIR, file),
}));

describe("skill markdown content", () => {
    it("finds skill markdown files to check", () => {
        expect(cases.length).toBeGreaterThan(0);
    });

    describe("frontmatter declares name + description", () => {
        it.each(cases)("$name", ({ file }) => {
            const content = readFileSync(file, "utf8");
            const fm = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
            expect(fm, "file must start with a --- frontmatter block").not.toBeNull();
            const block = fm![1];
            expect(/^name:/m.test(block), "frontmatter must declare `name:`").toBe(true);
            expect(/^description:/m.test(block), "frontmatter must declare `description:`").toBe(true);
        });
    });

    describe("no leaked build/loader artifacts", () => {
        const LEAK_PATTERNS: [RegExp, string][] = [
            [/\.md\.md/, "doubled `.md.md` extension (broken link/path)"],
            [/\*\*\* (Add File|Update File|Delete File|Begin Patch|End Patch):?/, "patch / file-generation marker"],
            [/fileURLToPath\(import\.meta\.url\)/, "leaked TypeScript loader code"],
        ];
        it.each(cases)("$name", ({ file }) => {
            const content = readFileSync(file, "utf8");
            for (const [re, label] of LEAK_PATTERNS) {
                expect(re.test(content), `must not contain ${label}`).toBe(false);
            }
        });
    });
});
