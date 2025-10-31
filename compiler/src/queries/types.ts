import { query } from "./query";
import { HasType, InTypeGroup } from "../compile";
import { Db, Node } from "../db";
import { typeReferencesNode } from "../typecheck/constraints/type";
import { IsTyped } from "../visit";
import { Group } from "../typecheck";

export const type = query(function* (db) {
    for (const [node, type] of db.list(HasType)) {
        yield { node, type };
    }
});

export const related = query(function* (db) {
    for (const [node, group] of db.list(InTypeGroup)) {
        for (const related of group.nodes.values()) {
            if (related !== node) {
                yield { node, related };
            }
        }
    }
});

export const conflictingTypes = query(function* (db, filter) {
    for (const [node, group] of db.list(InTypeGroup)) {
        const { instantiatedFrom, instantiatedBy: source } = node;

        if (group.types.length > 1) {
            yield {
                source,
                node: instantiatedFrom ?? node,
                types: group.types,
                nodes: group.nodes.values().filter(filter).toArray(),
            };
        }
    }
});

export const incompleteType = query(function* (db, filter) {
    for (const [node, _] of db.list(IsTyped)) {
        const types = db.list(node, HasType).toArray();
        if (types.length === 1) {
            const [type] = types;

            if (!(type instanceof Node) && typeReferencesNode(type)) {
                const group = db.get(node, InTypeGroup);
                if (group != null && isFirstNodeInGroup(node, group, filter)) {
                    yield { node, type };
                }
            }
        }
    }
});

export const unknownType = query(function* (db, filter) {
    for (const [node, _] of db.list(IsTyped)) {
        const types = db.list(node, HasType).toArray();
        if (types.length === 0) {
            const group = db.get(node, InTypeGroup);
            if (group != null && isFirstNodeInGroup(node, group, filter)) {
                yield { node };
            }
        }
    }
});

const isFirstNodeInGroup = (node: Node, group: Group, filter: (node: Node) => boolean) =>
    group.nodes.values().filter(filter).next().value === node;
