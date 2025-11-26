/// <reference types="jest" />

const { spawnSync } = require("node:child_process");
const { readdirSync } = require("node:fs");
const { join, extname, dirname, basename } = require("node:path");

for (const testPath of readdirSync(__dirname)) {
    if (extname(testPath) !== ".wipple") continue;

    test(testPath, () => {
        const { status, stdout, stderr } = spawnSync(
            "node",
            ["compiler", "compile", "--facts", join(basename(__dirname), testPath)],
            { cwd: dirname(__dirname) },
        );

        expect({
            status,
            stdout: stdout.toString(),
            stderr: stderr.toString(),
        }).toMatchSnapshot();
    });
}
