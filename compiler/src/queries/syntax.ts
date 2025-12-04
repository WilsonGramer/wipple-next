import { SyntaxError } from "../syntax";
import { query } from "./query";

export const syntaxError = query(function* (node) {
    const error = node.facts.get(SyntaxError);
    if (error != null) {
        yield { message: error.message };
    }
});
