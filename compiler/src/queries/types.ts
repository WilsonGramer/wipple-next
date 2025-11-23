import { InstantiatedNode, Node } from "../node";
import { ExpressionNode } from "../nodes/expressions";
import { PatternNode } from "../nodes/patterns";
import { Typed } from "../nodes/types";
import { typeReferencesNode } from "../typecheck";
import type { Group } from "../typecheck/solve";
import { query } from "./query";

export const type = query(function* (node) {
    const group = node.facts.get(Typed);
    if (group == null) {
        return;
    }

    yield { type: group.types[0] };
});

export const related = query(function* (node) {
    const group = node.facts.get(Typed);
    if (group == null) {
        return;
    }

    for (const related of group.nodes.values()) {
        if (related !== node) {
            yield { related };
        }
    }
});

export const conflictingTypes = query(function* (node, filter) {
    const instantiatedNode = node instanceof InstantiatedNode ? node : undefined;

    const group = node.facts.get(Typed);
    if (group == null) {
        return;
    }

    if (group.types.length > 1 && isFirstNodeInGroup(node, group, filter)) {
        yield {
            source: instantiatedNode?.source,
            from: instantiatedNode?.from,
            nodes: Iterator.from(group.nodes)
                .filter(filter)
                .filter((n) => n !== node)
                .toArray(),
            types: group.types,
        };
    }
});

export const incompleteType = query(function* (node, filter) {
    const group = node.facts.get(Typed);
    if (group == null) {
        return;
    }

    if (group.types.length !== 1 || !isFirstNodeInGroup(node, group, filter)) {
        return;
    }

    const [type] = group.types;

    if (!(type instanceof Node) && typeReferencesNode(type)) {
        yield { type };
    }
});

export const unknownType = query(function* (node, filter) {
    const group = node.facts.get(Typed);
    if (group == null) {
        return;
    }

    if (group.types.length === 0 && isFirstNodeInGroup(node, group, filter)) {
        yield { group };
    }
});

const isFirstNodeInGroup = (node: Node, group: Group, filter: (node: Node) => boolean) =>
    group.nodes.values().filter(filter).next().value === node;
