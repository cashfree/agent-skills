import { FRAMEWORKS, type Framework } from "./config.js";

export const VALID_ADD_TYPES = ["skills"] as const;

/**
 * Returns the closest match from `candidates` within `maxDistance` Levenshtein
 * edits, or null if no candidate is close enough. Used for "did you mean"
 * hints on mistyped subcommand arguments.
 */
export function findSimilar(
    input: string,
    candidates: readonly string[],
    maxDistance = 2,
): string | null {
    const distance = (a: string, b: string): number => {
        const m = a.length;
        const n = b.length;
        const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
        for (let i = 0; i <= m; i++) dp[i][0] = i;
        for (let j = 0; j <= n; j++) dp[0][j] = j;
        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i - 1][j - 1];
                else dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
            }
        }
        return dp[m][n];
    };
    let best: string | null = null;
    let bestDist = Infinity;
    for (const c of candidates) {
        const d = distance(input.toLowerCase(), c.toLowerCase());
        if (d < bestDist) {
            bestDist = d;
            best = c;
        }
    }
    return bestDist <= maxDistance ? best : null;
}

export function collectOptionValues(value: string, previous: string[]): string[] {
    previous.push(value);
    return previous;
}

export function getFrameworkName(framework: Framework): string {
    const found = FRAMEWORKS.find((f) => f.value === framework);
    return found?.name || framework;
}
