/// <reference types="jest" />

const { spawnSync } = require("node:child_process");
const { readdirSync } = require("node:fs");
const { join } = require("node:path");

for (const testPath of readdirSync("tests")) {
    test(testPath, () => {
        const { status, stdout, stderr } = spawnSync("node", [
            "compiler",
            "compile",
            "--facts",
            join("tests", testPath),
        ]);

        expect({
            status,
            stdout: stdout.toString(),
            stderr: stderr.toString(),
        }).toMatchSnapshot();
    });
}
