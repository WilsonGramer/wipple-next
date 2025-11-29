import * as queries from "../../queries";
import { registerFeedback } from "../register";
import { render } from "../render";

registerFeedback({
    id: "missing-instance-value",
    query: queries.missingInstanceValue,
    on: (node) => node,
    render: (node) => render`
        ${render.node(node)} is missing a value.

        Try adding a value for this instance using ${render.code(":")}.
    `,
});

registerFeedback({
    id: "extra-instance-value",
    query: queries.extraInstanceValue,
    on: (node) => node,
    render: (_node) => render`
        This instance doesn't need a value because it is marked with ${render.code("[error]")}.

        Remove this code.
    `,
});
