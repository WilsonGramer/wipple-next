import { NestedSetPattern } from "../nodes/patterns/set";
import { query } from "./query";

export const nestedSetPattern = query(function* (node) {
    if (node.facts.has(NestedSetPattern)) {
        yield {};
    }
});
