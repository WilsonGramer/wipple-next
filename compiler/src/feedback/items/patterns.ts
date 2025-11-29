import * as queries from "../../queries";
import { registerFeedback } from "../register";
import { render } from "../render";

registerFeedback({
    id: "nested-set-pattern",
    query: queries.nestedSetPattern,
    on: (node) => node,
    render: (node, {}) => render`
        ${render.node(node)} cannot be used inside another pattern.

        ${render.code("set")} can only be used immediately before a variable assignment using ${render.code(":")}.
    `,
});
