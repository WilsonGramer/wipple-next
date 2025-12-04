import * as queries from "../../queries";
import { registerFeedback } from "../register";
import { render } from "../render";

registerFeedback({
    id: "unresolved-bound",
    query: queries.unresolvedBound,
    on: (node) => node,
    render: (node, { bound }) => render`
        ${render.node(node)} requires the instance ${render.bound(
            bound,
        )}, but this instance isn't defined.

        Double-check that these types are correct.
    `,
});

registerFeedback({
    id: "error-instance",
    query: queries.errorInstance,
    on: (node) => node,
    render: (node, { bound, comments, links }) =>
        render`${render.comments(
            comments,
            { source: render.node(node), ...links },
            render`\n\n(This feedback comes from the instance ${render.bound(bound)}.)`,
        )}`,
});
