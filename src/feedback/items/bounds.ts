import { render } from "../render";
import { registerFeedback } from "../register";
import { HasUnresolvedBound } from "../../typecheck/constraints/bound";

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
