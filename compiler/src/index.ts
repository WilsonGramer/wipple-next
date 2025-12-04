import chalk from "chalk";
import * as cmd from "cmd-ts";
import { execSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";
import ProgressBar from "progress";
import wrapAnsi from "wrap-ansi";
import { Codegen } from "./codegen";
import { compile, makeRoot } from "./compile";
import { collectFeedback } from "./feedback";
import lsp from "./lsp";
import type { Filter, Node } from "./node";
import { nodeFilter } from "./node";
import { parse } from "./syntax";
import { parseFile } from "./syntax/grammar";

Error.stackTraceLimit = 100;

const jsonOutput: Record<string, any> = {};

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
            json: cmd.flag({
                long: "json",
                type: cmd.boolean,
            }),
        },
        handler: async (args) => {
            if (args.json) {
                chalk.level = 0; // disable colors
            }

            const root = makeRoot();
            const { db } = root;

            const readFile = (path: string) => {
                const source = readFileSync(path, "utf8");
                const file = parse(db, path, source, parseFile);
                return file ? [file] : [];
            };

            const libs = args.lib.map((path) => ({
                name: path,
                files: readdirSync(path)
                    .filter((fileName) => extname(fileName) === ".wipple")
                    .flatMap((fileName) => readFile(join(path, fileName))),
            }));

            const files = args.paths.flatMap((path) => readFile(path));

            const layers = [
                ...libs,
                { name: files.map((file) => file.span.path).join(", "), files },
            ];

            const filters = args.filterLines.map((filterLine): Filter => {
                if (!filterLine.includes(":")) {
                    return { path: args.paths.at(-1)!, line: parseFloat(filterLine) };
                }

                const [path, lineString] = filterLine.split(":");
                const line = parseFloat(lineString);
                return { path, line };
            });

            const filter = nodeFilter(filters);

            const progress = new ProgressBar(`[:bar] ${chalk.dim(":message")}`, {
                total: layers.length,
                width: 15,
                complete: "=",
                head: ">",
                incomplete: " ",
                clear: true,
            });

            const clearProgress = () => {
                progress.tick(layers.length, { message: "" });
                progress.terminate();
            };

            layers.forEach(({ name: path, files }, index) => {
                progress.tick(index, {
                    message: `Compiling ${path}`,
                });

                compile(root, files);
            });

            clearProgress();

            if (args.facts) {
                const dbString = db.display(filter);

                if (args.json) {
                    jsonOutput.facts = dbString;
                } else {
                    console.log(`${chalk.bold.underline("Facts:")}\n`);
                    console.log(dbString);
                }
            }

            if (args.json) {
                jsonOutput.feedback = "";
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

                if (args.json) {
                    jsonOutput.feedback += `${feedback.on.render()} (${feedback.id}):\n\n${rendered}\n`;
                } else {
                    console.log(
                        `${chalk.underline(`${feedback.on.render()} (${feedback.id}):`)}\n\n${rendered}\n`,
                    );
                }
            }

            if (feedbackCount > 0) {
                if (require.main === module) {
                    console.error(
                        chalk.bold(`Compilation failed with ${feedbackCount} feedback item(s)`),
                    );

                    process.exit(1);
                } else {
                    return;
                }
            }

            if (options.run || args.output != null) {
                if (require.main !== module) {
                    throw new Error("codegen only supported in the CLI");
                }

                const nodePrelude = (await import("inline:../../runtime/node-prelude.js")).default;
                const runtime = (await import("inline:../../runtime/runtime.js")).default;

                const codegen = new Codegen(files, args.output ?? "index.js", db, {
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

export const run = async (args: string[]) => {
    await cmd.run(
        cmd.subcommands({
            name: "wipple",
            cmds: {
                compile: compileCommand({ run: false }),
                run: compileCommand({ run: true }),
                lsp: lspCommand,
            },
        }),
        args,
    );

    return jsonOutput;
};

if (require.main === module) {
    void run(process.argv.slice(2));
}
