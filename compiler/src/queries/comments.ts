import { query } from "./query";
import type { Links } from "../feedback/render";
import { render } from "../feedback/render";
import { ResolvedBound } from "../typecheck/constraints/bound";
import type { Node } from "../node";
import { InstantiatedNode } from "../node";
import { Resolved, TypeParameters } from "../visit";
import { Typed } from "../nodes/types";
import { Definition } from "../visit/definitions";

export const errorInstance = query(function* (node) {
    for (const { bound, instance } of node.facts.get(ResolvedBound) ?? []) {
        if (instance != null && instance.attributes.error) {
            const links = getLinks(instance, node);
            yield { bound, comments: instance.comments, links };
        }
    }
});

export const comments = query(function* (node) {
    const definition = node.facts.get(Resolved);
    if (definition instanceof Definition) {
        const links = getLinks(definition.node, node);
        yield { node, comments: definition.comments, links };
    }
});

const getLinks = (node: Node, source: Node | undefined) => {
    const links: Links = {};

    for (const typeParameter of node.facts.get(TypeParameters) ?? []) {
        const instantiated = Iterator.from(node.db).find(
            (candidate): candidate is InstantiatedNode =>
                candidate instanceof InstantiatedNode &&
                candidate.from === typeParameter &&
                candidate.source === source,
        );

        if (instantiated == null) {
            continue;
        }

        const group = instantiated.facts.get(Typed);
        if (group == null) {
            continue;
        }

        const uses = group.nodes
            .values()
            .filter((node) => node !== instantiated && node.facts.get(Typed) != null)
            .map(render.node)
            .toArray();

        if (uses.length === 0) {
            continue;
        }

        links[typeParameter.name] = uses[0];

        links[typeParameter.name + "@related"] = { and: uses };

        links[typeParameter.name + "@type"] = {
            or: group.types.map((type) => render.type(type)),
        };
    }

    return links;
};
