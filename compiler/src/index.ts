import {
    array,
    command,
    multioption,
    number,
    positional,
    run,
    string,
    boolean,
    flag,
    subcommands,
    option,
    optional,
} from "cmd-ts";
import { readFileSync, writeFileSync } from "node:fs";
import { compile } from "./compile";
import { Db, Node } from "./db";
import { collectFeedback } from "./feedback";
import chalk from "chalk";
import wrapAnsi from "wrap-ansi";
import { inspect } from "node:util";
import { nodeFilter } from "./db/filter";
import lsp from "./lsp";
import { Codegen } from "./codegen";

inspect.defaultOptions.depth = null;

const cmd = subcommands({
    name: "wipple",
    cmds: {
        compile: command({
            name: "compile",
            args: {
                path: positional({ type: string }),
                facts: flag({ long: "facts", short: "f", type: boolean }),
                output: option({ long: "output", short: "o", type: optional(string) }),
                filterLines: multioption({ long: "filter-lines", short: "l", type: array(number) }),
                debugCodegen: flag({ long: "debug-codegen", type: boolean }),
            },
            handler: (args) => {
                const code = readFileSync(args.path, "utf8");
                const filters =
                    args.filterLines.length > 0
                        ? [{ path: args.path, lines: args.filterLines }]
                        : [];

                const filter = nodeFilter(filters);

                const db = new Db();
                const result = compile(db, { path: args.path, code });

                if (!result.success) {
                    switch (result.type) {
                        case "parse": {
                            console.error(
                                `${result.location.start.line}:${result.location.start.column}: syntax error: ${result.message}`,
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
                                .join("\n"),
                        )
                        .join("\n\n");

                    console.log(
                        `${chalk.underline(feedback.on.toString())}${chalk.underline(` (${feedback.id}):`)}\n\n${rendered}\n`,
                    );
                }

                if (args.output != null) {
                    let script: string | undefined;
                    try {
                        const codegen = new Codegen(db, {
                            format: { type: "module" },
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
                        writeFileSync(args.output, script);
                    }
                }
            },
        }),
        lsp: command({
            name: "lsp",
            args: {
                stdio: flag({
                    type: boolean,
                    long: "stdio",
                }),
            },
            handler: (_args) => {
                lsp();
            },
        }),
    },
});

run(cmd, process.argv.slice(2));
