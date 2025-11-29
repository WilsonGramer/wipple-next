import { OverlappingInstances } from "../compile";
import { InstantiatedNode, Node } from "../node";
import { ExtraType, MissingType, Typed } from "../nodes/types";
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

export const missingType = query(function* (node) {
    const parameter = node.facts.get(MissingType);

    if (parameter != null) {
        yield { parameter };
    }
});

export const extraType = query(function* (node) {
    if (node.facts.has(ExtraType)) {
        yield {};
    }
});

const isFirstNodeInGroup = (node: Node, group: Group, filter: (node: Node) => boolean) =>
    group.nodes.filter(filter)[0] === node;

export const overlappingInstances = query(function* (node) {
    const instances = node.facts.get(OverlappingInstances);
    if (instances == null) {
        return;
    }

    yield { instances };
});
