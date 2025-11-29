import * as queries from "../../queries";
import { registerFeedback } from "../register";
import { render } from "../render";

registerFeedback({
    id: "missing-format-inputs",
    query: queries.missingFormatInputs,
    on: (node) => node,
    render: (node, { count }) => render`
        ${render.node(node)} needs ${render.number(count, "more input", "more inputs")}.

        Try adding code after the string.
    `,
});

registerFeedback({
    id: "extra-format-input",
    query: queries.extraFormatInput,
    on: (node) => node,
    render: (node) => render`
        ${render.node(node)} isn't used in the format string.

        Try removing this input or add another ${render.code("_")} placeholder.
    `,
});
