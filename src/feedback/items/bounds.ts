import { render, renderComments } from "../render";
import { registerFeedback } from "../register";
import { HasResolvedBound, HasUnresolvedBound } from "../../typecheck/constraints/bound";
import { IsErrorInstance } from "../../visit/statements/instance-definition";
import { Node } from "../../db";
import { HasTypeParameter } from "../../visit/types/parameter";
import { InTypeGroup } from "../../compile";
import { IsTyped } from "../../visit";

registerFeedback({
    id: "unresolved-bound",
    query: function* (db) {
        for (const [node, bound] of db.list(HasUnresolvedBound)) {
            yield { node, bound };
        }
    },
    on: ({ node }) => node,
    render: ({ node, bound }) => render`
        ${node} requires the instance ${render.bound(bound)}, but this instance isn't defined.

        Double-check that these types are correct.
    `,
});

registerFeedback({
    id: "error-instance",
    query: function* (db, filter) {
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
    },
    on: ({ node }) => node,
    render: ({ node, bound, comments, links }) =>
        renderComments(
            comments,
            { source: node, ...links },
            `\n\n(This feedback comes from the instance ${render.bound(bound)}.)`,
        ),
});
