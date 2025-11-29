import {
    DuplicateAttribute,
    ExtraAttributeValue,
    MissingAttributeValue,
    MismatchedAttributeValue,
    UnsupportedAttribute,
} from "../visit/attributes";
import { query } from "./query";

export const extraAttributeValue = query(function* (node) {
    if (node.facts.has(ExtraAttributeValue)) {
        yield {};
    }
});

export const unsupportedAttribute = query(function* (node) {
    if (node.facts.has(UnsupportedAttribute)) {
        yield {};
    }
});

export const duplicateAttribute = query(function* (node) {
    if (node.facts.has(DuplicateAttribute)) {
        yield {};
    }
});

export const mismatchedAttributeValue = query(function* (node) {
    if (node.facts.has(MismatchedAttributeValue)) {
        yield {};
    }
});

export const missingAttributeValue = query(function* (node) {
    if (node.facts.has(MissingAttributeValue)) {
        yield {};
    }
});
