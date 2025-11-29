import { Typed, TypeNode } from "../nodes/types";
import { TypeParameterNode } from "../nodes/types/parameter";
import { types } from "../typecheck";
import { Resolved } from "../visit";
import { Defined, TraitDefinition } from "../visit/definitions";
import { query } from "./query";

export const highlightType = query(function* (node) {
    if (node instanceof TypeNode && !(node instanceof TypeParameterNode)) {
        yield {};
    }
});

export const highlightTrait = query(function* (node) {
    if (
        node.facts.get(Resolved)?.[1].some((d) => d instanceof TraitDefinition) ||
        node.facts.get(Defined) instanceof TraitDefinition
    ) {
        yield {};
    }
});

const highlightTag = (tag: unknown) =>
    query(function* (node) {
        if (node.facts.get(Resolved) == null || node.facts.get(Defined) != null) {
            return;
        }

        const group = node.facts.get(Typed);
        if (group == null) {
            return;
        }

        const type = group.types[0];

        if (type.tag === tag) {
            yield {};
        }
    });

export const highlightFunction = highlightTag(types.function);
export const highlightTypeParameter = highlightTag(types.parameter);
