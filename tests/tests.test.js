import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { basename, dirname, extname, join } from "node:path";
import { expect, test } from "vitest";

for (const testFile of readdirSync(__dirname)) {
    if (extname(testFile) !== ".wipple") continue;

    test(testFile, async (t) => {
        const { status, stdout, stderr } = spawnSync(
            "node",
            ["compiler", "compile", "--facts", join(basename(__dirname), testFile)],
            { cwd: dirname(__dirname) },
        );

        await expect({
            status,
            stdout: stdout.toString(),
            stderr: stderr.toString(),
        }).toMatchFileSnapshot(join("__snapshots__", `${testFile}.snapshot`));
    });
}
