import { ExtraElement } from "../nodes/patterns/constructor";
import { NestedSetPattern } from "../nodes/patterns/set";
import { query } from "./query";

export const nestedSetPattern = query(function* (node) {
    if (node.facts.has(NestedSetPattern)) {
        yield {};
    }
});

export const extraElement = query(function* (node) {
    if (node.facts.has(ExtraElement)) {
        yield {};
    }
});
