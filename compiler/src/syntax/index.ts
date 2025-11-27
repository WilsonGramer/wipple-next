/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import type { Interval } from "ohm-js";
import { Node } from "../node";
import type { FileNode } from "../nodes";
import type { Location, Span } from "../span";
import grammar from "./grammar.ohm-bundle";
import parser from "./parser";

export class SyntaxError extends Error {
    span: Span;

    constructor(message: string, span: Span) {
        super(`${span.path}:${span.start.line}:${span.start.column}: syntax error: ${message}`);
        this.span = span;
    }
}

const parseRule = (path: string, source: string, rule = "File") => {
    const location = (interval: Interval): Location => {
        const { lineNum, colNum, offset } = interval.getLineAndColumn();
        return { line: lineNum, column: colNum, offset };
    };

    const span = (left: { source: Interval }, right = left): Span => ({
        path,
        start: location(left.source),
        end: location(right.source),
        source: source.slice(left.source.startIdx, right.source.endIdx),
    });

    const matchResult = grammar.match(source, rule);
    if (matchResult.failed()) {
        throw new SyntaxError(
            matchResult.shortMessage?.replace(/Line \d+, col \d+: /, "").replaceAll('"', "`") ??
                "syntax error",
            span({ source: matchResult.getInterval() }),
        );
    }

    const semantics = grammar.createSemantics();
    semantics.addOperation<any>("parse()", parser(span));

    const result = semantics(matchResult).parse();

    return result;
};

export const parseFile = (path: string, source: string): FileNode =>
    parseRule(path, source, "File");

export const testParse = (rule: string, source: string) => {
    const ast = parseRule("test", source, rule);

    const filter = (value: any) => {
        if (Array.isArray(value)) {
            value.forEach(filter);
        } else if (typeof value === "object" && value !== null) {
            if (value instanceof Node) {
                // @ts-expect-error
                delete value.facts;
                // @ts-expect-error
                delete value.isHidden;
            } else if (
                "source" in value &&
                "startIdx" in value.source &&
                "endIdx" in value.source
            ) {
                throw new Error(
                    `node not converted: ${value.source.startIdx}:${value.source.endIdx}`,
                );
            }

            delete value.span;

            for (const [k, v] of Object.entries(value)) {
                if (v === undefined) {
                    delete value[k];
                } else {
                    filter(v);
                }
            }
        }
    };

    filter(ast);

    return ast;
};

export const nullSpan = (path: string): Span => ({
    path,
    source: "",
    start: { line: 1, column: 1, offset: 0 },
    end: { line: 1, column: 1, offset: 0 },
});

export const debugParseTree = (node: Node, indent = 0): void => {
    // eslint-disable-next-line no-console
    console.log(`${"  ".repeat(indent)}${node.toString()}`);

    for (const child of node.children()) {
        if (!(child instanceof Node)) {
            throw new Error(
                `child of ${node.toString()} not converted: ${(child as any)?.constructor?.name}`,
            );
        }

        debugParseTree(child, indent + 1);
    }
};
