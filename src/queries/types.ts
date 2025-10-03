import { query } from "./query";
import { HasType, InTypeGroup } from "../compile";
import { Node } from "../db";
import { typeReferencesNode } from "../typecheck/constraints/type";
import { IsTyped } from "../visit";

export const type = query(function* (db) {
    for (const [node, type] of db.list(HasType)) {
        yield { node, type };
    }
});

export const conflictingTypes = query(function* (db) {
    for (const [node, group] of db.list(InTypeGroup)) {
        const { instantiatedFrom, instantiatedBy: source } = node;

        if (group.types.length > 1) {
            yield {
                source,
                node: instantiatedFrom ?? node,
                types: group.types,
                nodes: group.nodes.values().toArray(),
            };
        }
    }
});

export const incompleteType = query(function* (db) {
    for (const [node, _] of db.list(IsTyped)) {
        const types = db.list(node, HasType).toArray();
        if (types.length === 1) {
            const [type] = types;

            if (!(type instanceof Node) && typeReferencesNode(type)) {
                yield { node, type };
            }
        }
    }
});

export const unknownType = query(function* (db) {
    for (const [node, _] of db.list(IsTyped)) {
        const types = db.list(node, HasType).toArray();
        if (types.length === 1) {
            const [type] = types;

            if (type instanceof Node) {
                yield { node };
            }
        }
    }
});
