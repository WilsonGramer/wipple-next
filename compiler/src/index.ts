import * as cmd from "cmd-ts";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { compile } from "./compile";
import { Db, Node } from "./db";
import { collectFeedback } from "./feedback";
import chalk from "chalk";
import wrapAnsi from "wrap-ansi";
import { inspect } from "node:util";
import { nodeFilter } from "./db/filter";
import lsp from "./lsp";
import { Codegen } from "./codegen";
import runtime from "inline:../runtime/runtime.js";
import nodePrelude from "inline:../runtime/node-prelude.js";
import { execSync } from "node:child_process";

inspect.defaultOptions.depth = null;

const compileCommand = (options: { run: boolean }) =>
    cmd.command({
        name: "compile",
        args: {
            path: cmd.positional({
                type: cmd.string,
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
                long: "filter-lines",
                short: "l",
                type: cmd.array(cmd.number),
            }),
            debugCodegen: cmd.flag({
                long: "debug-codegen",
                type: cmd.boolean,
            }),
        },
        handler: (args) => {
            const code = readFileSync(args.path, "utf8");
            const filters =
                args.filterLines.length > 0 ? [{ path: args.path, lines: args.filterLines }] : [];

            const filter = nodeFilter(filters);

            const db = new Db();
            const result = compile(db, { path: args.path, code });

            if (!result.success) {
                switch (result.type) {
                    case "parse": {
                        console.error(
                            `${result.location.start.line}:${result.location.start.column}: syntax error: ${result.message}`
                        );

                        return;
                    }
                    default:
                        result.type satisfies never;
                        throw new Error("unknown error");
                }
            }

            if (args.facts) {
                console.log(`${chalk.bold.underline("Facts:")}\n`);
                db.log(filter);

                console.log(`\n${chalk.bold.underline("Feedback:")}\n`);
            }

            const seenFeedback = new Map<Node, Set<string>>();
            for (const feedback of collectFeedback(db)) {
                if (!seenFeedback.get(feedback.on)) {
                    seenFeedback.set(feedback.on, new Set());
                }

                const seenFeedbackForNode = seenFeedback.get(feedback.on)!;

                if (seenFeedbackForNode.has(feedback.id)) {
                    continue;
                }

                seenFeedbackForNode.add(feedback.id);

                const indent = "  ";

                const rendered = feedback.rendered
                    .toString()
                    .split("\n\n")
                    .map((s) =>
                        wrapAnsi(s, 100 - indent.length)
                            .split("\n")
                            .map((line) => indent + line)
                            .join("\n")
                    )
                    .join("\n\n");

                console.log(
                    `${chalk.underline(feedback.on.toString())}${chalk.underline(
                        ` (${feedback.id}):`
                    )}\n\n${rendered}\n`
                );
            }

            let script: string | undefined;
            try {
                const codegen = new Codegen(db, {
                    format: { type: "iife", arg: "buildRuntime(env)" },
                    debug: args.debugCodegen,
                });

                script = codegen.run();
            } catch (e) {
                if (args.debugCodegen) {
                    console.error(e);
                } else {
                    console.error(chalk.bold("Compilation failed"));
                }
            }

            if (script != null) {
                script = nodePrelude + runtime + script;

                if (args.output != null) {
                    writeFileSync(args.output, script);
                }

                if (options.run) {
                    const tempDir = mkdtempSync("wipple-");
                    const scriptPath = `${tempDir}/script.js`;
                    writeFileSync(scriptPath, script);
                    execSync(`node ${scriptPath}`, { stdio: "inherit" });
                    rmSync(tempDir, { recursive: true, force: true });
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

cmd.run(
    cmd.subcommands({
        name: "wipple",
        cmds: {
            compile: compileCommand({ run: false }),
            run: compileCommand({ run: true }),
            lsp: lspCommand,
        },
    }),
    process.argv.slice(2)
);
