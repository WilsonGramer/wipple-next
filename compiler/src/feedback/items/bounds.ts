import { render, renderComments } from "../render";
import { registerFeedback } from "../register";
import * as queries from "../../queries";

registerFeedback({
    id: "unresolved-bound",
    query: queries.unresolvedBound,
    on: ({ node }) => node,
    render: ({ node, bound }) => render`
        ${node} requires the instance ${render.bound(bound)}, but this instance isn't defined.

        Double-check that these types are correct.
    `,
});

registerFeedback({
    id: "error-instance",
    query: queries.errorInstance,
    on: ({ node }) => node,
    render: ({ node, bound, comments, links }) =>
        renderComments(
            comments,
            { source: node, ...links },
            `\n\n(This feedback comes from the instance ${render.bound(bound)}.)`,
        ),
});
