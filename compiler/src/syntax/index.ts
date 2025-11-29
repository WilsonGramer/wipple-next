import type { Interval } from "ohm-js";
import { Db, Fact } from "../db";
import { Node } from "../node";

import lineColumn from "line-column";
import type { FileNode } from "../nodes";
import type { Location, Span } from "../span";
import type { Visitor } from "../visit";
import grammar from "./grammar.ohm-bundle";
import parser from "./parser";

class SyntaxErrorNode extends Node {
    *children() {}

    visit(_visitor: Visitor): void {}
}

export class SyntaxError extends Fact<string> {
    display(expected: string): string {
        return `syntax error: expected ${expected}`;
    }
}

const parseRule = (db: Db, path: string, source: string, rule = "File") => {
    const index = lineColumn(source);

    const location = (offset: number): Location => {
        const { line, col } = index.fromIndex(offset) ?? index.fromIndex(offset - 1)!;
        return { line, column: col, offset };
    };

    const span = (node: { source: Interval }): Span => ({
        path,
        start: location(node.source.startIdx),
        end: location(node.source.endIdx),
        source: source.slice(node.source.startIdx, node.source.endIdx),
    });

    const matchResult = grammar.match(source, rule);
    if (matchResult.failed()) {
        const node = new SyntaxErrorNode(span({ source: matchResult.getInterval() }));
        db.register(node);

        node.facts.set(SyntaxError, (matchResult as any).getExpectedText());

        return node;
    }

    const semantics = grammar.createSemantics();
    semantics.addOperation<any>("parse()", parser(span));

    const result = semantics(matchResult).parse();

    return result;
};

export const parseFile = (db: Db, path: string, source: string): FileNode =>
    parseRule(db, path, source, "File");

export const testParse = (rule: string, source: string) => {
    const db = new Db();
    const ast = parseRule(db, "test", source, rule);

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
