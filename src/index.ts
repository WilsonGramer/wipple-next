import {
    array,
    command,
    multioption,
    number,
    positional,
    run,
    string,
    subcommands,
} from "cmd-ts/dist/esm";
import { readFileSync } from "node:fs";
import { compile } from "./compile";
import { Db, Node } from "./db";
import { collectFeedback } from "./feedback";
import chalk from "chalk";
import wrapAnsi from "wrap-ansi";
import { inspect } from "node:util";
import { nodeFilter } from "./db/filter";
import lsp from "./lsp";
import { boolean, flag } from "cmd-ts";
import { Codegen } from "./codegen";

inspect.defaultOptions.depth = null;

const cmd = subcommands({
    name: "wipple",
    cmds: {
        compile: command({
            name: "compile",
            args: {
                path: positional({ type: string }),
                filterLines: multioption({ long: "filter-lines", short: "l", type: array(number) }),
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

                console.log(`${chalk.bold.underline("Facts:")}\n`);
                db.log(filter);

                console.log(`\n${chalk.bold.underline("Feedback:")}\n`);

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

                let script: string | undefined;
                try {
                    const codegen = new Codegen(db, {
                        format: { type: "module" },
                        debug: true,
                    });

                    script = codegen.run();
                } catch (e) {
                    // Compile error
                    console.error(e);
                }

                if (script != null) {
                    console.log(script);
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
