import * as queries from "../../queries";
import { registerFeedback } from "../register";
import { render } from "../render";

registerFeedback({
    id: "missing-constant-value",
    query: queries.missingConstantValue,
    on: (node) => node,
    render: (node) => render`
        ${render.node(node)} is missing a value.

        Try giving defining a value for this constant using ${render.code(":")} on the following line.
    `,
});
