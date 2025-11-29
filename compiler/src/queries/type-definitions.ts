import {
    DuplicateFieldDefinition,
    DuplicateVariantDefinition,
} from "../nodes/statements/type-definition";
import { query } from "./query";

export const duplicateFieldDefinition = query(function* (node) {
    if (node.facts.has(DuplicateFieldDefinition)) {
        yield {};
    }
});

export const duplicateVariantDefinition = query(function* (node) {
    if (node.facts.has(DuplicateVariantDefinition)) {
        yield {};
    }
});
