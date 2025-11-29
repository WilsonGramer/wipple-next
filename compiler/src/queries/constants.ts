import { MissingConstantValue } from "../nodes/statements/constant-definition";
import { query } from "./query";

export const missingConstantValue = query(function* (node) {
    if (node.facts.has(MissingConstantValue)) {
        yield {};
    }
});
