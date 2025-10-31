import { readFileSync } from "fs";
import { resolve } from "path";
import { compile } from "../src/compile";
import { Db, Node } from "../src/db";
import { AssertionError } from "assert";
import { IsPlaceholderExpression } from "../src/visit/expressions/placeholder";
import { IsPlaceholderType } from "../src/visit/types/placeholder";
import { collectFeedback } from "../src/feedback";
import { IsWildcardPattern } from "../src/visit/patterns/wildcard";
import { nodeFilter } from "../src/db/filter";

export const compileTest = (path: string) => {
    const code = readFileSync(resolve(__dirname, path), "utf8");

    const db = new Db();
    const result = compile(db, { files: [{ path, code }] });

    if (!result.success) {
        throw new AssertionError({ message: result.message });
    }

    const placeholders = [
        ...db.list(IsWildcardPattern).map(([node]) => node),
        ...db.list(IsPlaceholderExpression).map(([node]) => node),
        ...db.list(IsPlaceholderType).map(([node]) => node),
    ];

    // Sort by source code location
    placeholders.sort((a, b) => {
        if (a.span.range.start.offset !== b.span.range.start.offset) {
            return a.span.range.start.offset - b.span.range.start.offset;
        } else {
            return a.span.range.end.offset - b.span.range.end.offset;
        }
    });

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
