import * as queries from "../../queries";
import { registerFeedback } from "../register";
import { render } from "../render";

registerFeedback({
    id: "missing-field",
    query: queries.missingField,
    on: (node) => node,
    render: (node, { field }) => render`
        ${render.node(node)} is missing a pattern for the field ${render.code(field)}.

        Try adding a pattern for this field using ${render.code(":")}.
    `,
});

registerFeedback({
    id: "extra-field",
    query: queries.extraField,
    on: (node) => node,
    render: (_node, { field }) => render`
        ${render.code(field)} isn't a field on this structure.

        Double-check your spelling.
    `,
});

registerFeedback({
    id: "duplicate-field",
    query: queries.duplicateField,
    on: (node) => node,
    render: (node) => render`
        ${render.node(node)} is defined more than once.

        Try removing this field.
    `,
});
