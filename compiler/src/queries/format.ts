import { ExtraFormatInput, MissingFormatInputs } from "../nodes/expressions/format";
import { query } from "./query";

export const missingFormatInputs = query(function* (node) {
    const count = node.facts.get(MissingFormatInputs);
    if (count != null && count > 0) {
        yield { count };
    }
});

export const extraFormatInput = query(function* (node) {
    if (node.facts.has(ExtraFormatInput)) {
        yield {};
    }
});
