import { readFileSync } from "fs";
import { resolve } from "path";
import { compile, makeRoot } from "../src/compile";
import { collectFeedback } from "../src/feedback";
import type { Node } from "../src/node";
import { nodeFilter } from "../src/node";
import { PlaceholderExpressionNode } from "../src/nodes/expressions/placeholder";
import { WildcardPatternNode } from "../src/nodes/patterns/wildcard";
import { Typed } from "../src/nodes/types";
import { PlaceholderTypeNode } from "../src/nodes/types/placeholder";
import { compareSpans } from "../src/span";
import { displayType } from "../src/typecheck";

export const compileTest = (path: string) => {
    const code = readFileSync(resolve(__dirname, path), "utf8");

    const root = makeRoot();
    const { db } = root;

    const result = compile(root, { files: [{ path, code }] });

    expect(result).toMatchObject({ success: true });

    const placeholders = Iterator.from(db)
        .filter(
            (node) =>
                node instanceof WildcardPatternNode ||
                node instanceof PlaceholderExpressionNode ||
                node instanceof PlaceholderTypeNode,
        )
        .toArray();

    placeholders.sort((a, b) => compareSpans(a.span, b.span));

    const feedback = new Map<Node, string[]>();
    for (const feedbackItem of collectFeedback(db, nodeFilter())) {
        if (!feedback.has(feedbackItem.on)) {
            feedback.set(feedbackItem.on, []);
        }

        feedback.get(feedbackItem.on)!.push(feedbackItem.id);
    }

    return {
        db,
        placeholders,
        feedback,
    };
};

export const testTypes = (node: Node, expected: string[]) => {
    const types = node.facts.get(Typed)?.types.map((type) => displayType(type)) ?? [];
    expect(new Set(types)).toEqual(new Set(expected));
};
