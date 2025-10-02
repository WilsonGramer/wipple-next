import { query } from "./query";
import { InTypeGroup } from "../compile";
import { Node } from "../db";
import { HasResolvedBound, HasUnresolvedBound } from "../typecheck/constraints/bound";
import { IsTyped } from "../visit";
import { IsErrorInstance } from "../visit/statements/instance-definition";
import { HasTypeParameter } from "../visit/types/parameter";

export const unresolvedBound = query(function* (db) {
    for (const [node, bound] of db.list(HasUnresolvedBound)) {
        yield { node, bound };
    }
});

export const errorInstance = query(function* (db) {
    for (const [node, [bound, instanceNode]] of db.list(HasResolvedBound)) {
        const comments = db.get(instanceNode, IsErrorInstance);
        if (comments != null) {
            const links: Record<string, Node> = {};
            for (const typeParameter of db.list(instanceNode, HasTypeParameter)) {
                const instantiated = db
                    .nodes()
                    .find(
                        (candidate) =>
                            candidate.instantiatedFrom === typeParameter.node &&
                            candidate.instantiatedBy === bound.source,
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

            yield { node, bound, comments, links };
        }
    }
});
