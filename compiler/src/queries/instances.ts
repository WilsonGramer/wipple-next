import { ExtraInstanceValue, MissingInstanceValue } from "../nodes/statements/instance-definition";
import { query } from "./query";

export const missingInstanceValue = query(function* (node) {
    if (node.facts.has(MissingInstanceValue)) {
        yield {};
    }
});

export const extraInstanceValue = query(function* (node) {
    if (node.facts.has(ExtraInstanceValue)) {
        yield {};
    }
});
