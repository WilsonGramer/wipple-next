import { DuplicateField, ExtraField, MissingField } from "../nodes/expressions/structure";
import { query } from "./query";

export const missingField = query(function* (node) {
    const field = node.facts.get(MissingField);

    if (field != null) {
        yield { field };
    }
});

export const extraField = query(function* (node) {
    const field = node.facts.get(ExtraField);

    if (field != null) {
        yield { field };
    }
});

export const duplicateField = query(function* (node) {
    if (node.facts.has(DuplicateField)) {
        yield {};
    }
});
