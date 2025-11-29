import { SyntaxError } from "../syntax";
import { query } from "./query";

export const syntaxError = query(function* (node) {
    const expected = node.facts.get(SyntaxError);
    if (expected != null) {
        yield { expected };
    }
});
