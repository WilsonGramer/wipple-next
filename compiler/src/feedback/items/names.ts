import { render } from "../render";
import { registerFeedback } from "../register";
import * as queries from "../../queries";

registerFeedback({
    id: "unresolved",
    query: queries.unresolved,
    on: (node) => node,
    render: (_node, { name }) => render`
        Can't find ${render.code(name)}.

        Double-check your spelling.
    `,
});

registerFeedback({
    id: "unused",
    query: queries.unused,
    on: (node) => node,
    render: (node) => render`
        ${render.node(node)} is never used.

        If you don't need this definition, you can remove it.
    `,
});
