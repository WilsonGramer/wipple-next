import { query } from "./query";
import { InTypeGroup } from "../compile";
import { Db, Node } from "../db";
import { HasResolvedBound } from "../typecheck/constraints/bound";
import { IsTyped } from "../visit";
import { IsErrorInstance, ResolvedInstance } from "../visit/statements/instance-definition";
import { HasTypeParameter } from "../visit/types/parameter";
import { ResolvedConstant, ResolvedVariable } from "../visit/expressions/variable";
import { ResolvedConstructor } from "../visit/expressions/constructor";
import { ResolvedNamedType } from "../visit/types/named";
import { Definition } from "../visit/visitor";
import { render, Renderable } from "../feedback/render";

export const errorInstance = query(function* (db) {
    for (const [node, [bound, instanceNode]] of db.list(HasResolvedBound)) {
        const comments = db.get(instanceNode, IsErrorInstance);
        if (comments != null) {
            const links = getLinks(db, instanceNode, bound.source);
            yield { node, bound, comments, links };
        }
    }
});

export const comments = query(function* (db) {
    for (const [node, definitionNode] of [
        ...db.list(ResolvedVariable),
        ...db.list(ResolvedNamedType),
        ...db.list(ResolvedConstructor),
        ...db.list(ResolvedConstant),
        ...db.list(ResolvedInstance),
    ]) {
        const definition = db.get(definitionNode, Definition);
        if (definition != null && "comments" in definition) {
            const links = getLinks(db, definitionNode, node);
            yield { node, comments: definition.comments, links };
        }
    }
});

export type Links = ReturnType<typeof getLinks>;

const getLinks = (db: Db, node: Node, source: Node | undefined) => {
    const links: Record<string, Node | { or: Renderable[] } | { and: Renderable[] }> = {};
    for (const typeParameter of db.list(node, HasTypeParameter)) {
        const instantiated = db
            .nodes()
            .find(
                (candidate) =>
                    candidate.instantiatedFrom === typeParameter.node &&
                    candidate.instantiatedBy === source,
            );

        if (instantiated == null) {
            continue;
        }

        const group = db.get(instantiated, InTypeGroup);
        if (group == null) {
            continue;
        }

        const uses = group.nodes
            .values()
            .filter((node) => node !== instantiated && db.has(node, IsTyped))
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
