import { readdirSync } from "node:fs";
import { basename, dirname, extname, join } from "node:path";
import { chdir } from "node:process";
import { expect, test } from "vitest";
import { run } from "../compiler/src";

const testFiles = readdirSync(__dirname);

chdir(dirname(__dirname));

for (const testFile of testFiles) {
    if (extname(testFile) !== ".wipple") continue;

    test(testFile, async () => {
        const output = await run([
            "compile",
            "--json",
            "--facts",
            join(basename(__dirname), testFile),
        ]);

        await expect(output).toMatchFileSnapshot(join("__snapshots__", `${testFile}.snapshot`));
    });
}
