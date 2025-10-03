import { query } from "./query";
import { InTypeGroup } from "../compile";
import { Db, Node } from "../db";
import { HasResolvedBound } from "../typecheck/constraints/bound";
import { IsTyped } from "../visit";
import { IsErrorInstance, ResolvedInstance } from "../visit/statements/instance-definition";
import { HasTypeParameter } from "../visit/types/parameter";
import { ResolvedConstant, ResolvedVariable } from "../visit/expressions/variable";
import { ResolvedTrait } from "../visit/expressions/trait";
import { ResolvedNamedType } from "../visit/types/named";
import { Definition } from "../visit/visitor";

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
        ...db.list(ResolvedTrait),
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

const getLinks = (db: Db, node: Node, source: Node | undefined) => {
    const links: Record<string, Node> = {};
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

        const firstUse = db
            .get(instantiated, InTypeGroup)
            ?.nodes.difference(new Set([instantiated]))
            .values()
            .filter((node) => db.has(node, IsTyped))
            .toArray()[0];

        if (firstUse == null) {
            continue;
        }

        links[typeParameter.name] = firstUse;
    }

    return links;
};
