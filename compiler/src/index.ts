import chalk from "chalk";
import * as cmd from "cmd-ts";
import nodePrelude from "inline:../../runtime/node-prelude.js";
import runtime from "inline:../../runtime/runtime.js";
import { execSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";
import wrapAnsi from "wrap-ansi";
import { Codegen } from "./codegen";
import { compile, makeRoot } from "./compile";
import { collectFeedback } from "./feedback";
import lsp from "./lsp";
import type { Filter, Node } from "./node";
import { nodeFilter } from "./node";

const compileCommand = (options: { run: boolean }) =>
    cmd.command({
        name: "compile",
        args: {
            lib: cmd.multioption({
                long: "lib",
                type: cmd.array(cmd.string),
            }),
            facts: cmd.flag({
                long: "facts",
                type: cmd.boolean,
            }),
            output: cmd.option({
                long: "output",
                short: "o",
                type: cmd.optional(cmd.string),
            }),
            filterLines: cmd.multioption({
                long: "filter-line",
                short: "l",
                type: cmd.array(cmd.string),
            }),
            filterFeedback: cmd.multioption({
                long: "filter-feedback",
                type: cmd.array(cmd.string),
            }),
            paths: cmd.restPositionals({
                type: cmd.string,
            }),
        },
        handler: (args) => {
            const libs = args.lib.map((libPath) =>
                readdirSync(libPath)
                    .filter((fileName) => extname(fileName) === ".wipple")
                    .map((fileName) => {
                        const filePath = join(libPath, fileName);

                        return {
                            path: filePath,
                            source: readFileSync(filePath, "utf8"),
                        };
                    }),
            );

            const files = args.paths.map((path) => ({
                path,
                source: readFileSync(path, "utf8"),
            }));

            const layers = [...libs, files];

            const filters = args.filterLines.map((filterLine): Filter => {
                if (!filterLine.includes(":")) {
                    return { path: args.paths.at(-1)!, line: parseFloat(filterLine) };
                }

                const [path, lineString] = filterLine.split(":");
                const line = parseFloat(lineString);
                return { path, line };
            });

            const filter = nodeFilter(filters);

            const root = makeRoot();
            const { db } = root;

            for (const files of layers) {
                const result = compile(root, { files });

                if (!result.success) {
                    switch (result.type) {
                        case "parse": {
                            console.error(result.message);

                            return;
                        }
                        default:
                            result.type satisfies never;
                            throw new Error("unknown error");
                    }
                }
            }

            if (args.facts) {
                console.log(`${chalk.bold.underline("Facts:")}\n`);
                db.log(filter);

                console.log(`\n${chalk.bold.underline("Feedback:")}\n`);
            }

            const seenFeedback = new Map<Node, Set<string>>();
            let feedbackCount = 0;
            for (const feedback of collectFeedback(db, filter)) {
                if (args.filterFeedback.length > 0 && !args.filterFeedback.includes(feedback.id)) {
                    continue;
                }

                if (!filter(feedback.on)) {
                    continue;
                }

                if (!seenFeedback.get(feedback.on)) {
                    seenFeedback.set(feedback.on, new Set());
                }

                const seenFeedbackForNode = seenFeedback.get(feedback.on)!;

                if (seenFeedbackForNode.has(feedback.id)) {
                    continue;
                }

                seenFeedbackForNode.add(feedback.id);
                feedbackCount += 1;

                const indent = "  ";

                const rendered = feedback.rendered
                    .render()
                    .trim()
                    .split("\n\n")
                    .map((s) =>
                        wrapAnsi(s, 100 - indent.length)
                            .split("\n")
                            .map((line) => indent + line)
                            .join("\n"),
                    )
                    .join("\n\n");

                console.log(
                    `${chalk.underline(feedback.on.toString())}${chalk.underline(
                        ` (${feedback.id}):`,
                    )}\n\n${rendered}\n`,
                );
            }

            if (feedbackCount > 0) {
                console.error(
                    chalk.bold(`Compilation failed with ${feedbackCount} feedback item(s)`),
                );
                process.exit(1);
            }

            const codegen = new Codegen(files, args.output ?? "index.mjs", db, {
                format: { type: "iife", arg: "buildRuntime(env)" },
                prelude: nodePrelude + runtime,
            });

            const script = codegen.run(root.files);

            if (script != null) {
                if (args.output != null) {
                    writeFileSync(args.output, script);
                }

                if (options.run) {
                    const tempDir = mkdtempSync(join(tmpdir(), "wipple-"));
                    const scriptPath = `${tempDir}/index.mjs`;
                    writeFileSync(scriptPath, script);
                    execSync(`node ${scriptPath}`, { stdio: "inherit" });
                    rmSync(tempDir, { recursive: true, force: true });
                }
            } else {
                console.error(chalk.bold("Compilation failed during codegen"));
            }
        },
    });

const lspCommand = cmd.command({
    name: "lsp",
    args: {
        stdio: cmd.flag({
            type: cmd.boolean,
            long: "stdio",
        }),
    },
    handler: (_args) => {
        lsp();
    },
});

void cmd.run(
    cmd.subcommands({
        name: "wipple",
        cmds: {
            compile: compileCommand({ run: false }),
            run: compileCommand({ run: true }),
            lsp: lspCommand,
        },
    }),
    process.argv.slice(2),
);
