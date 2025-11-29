import * as queries from "../../queries";
import { registerFeedback } from "../register";
import { render } from "../render";

registerFeedback({
    id: "duplicate-field-definition",
    query: queries.duplicateFieldDefinition,
    on: (node) => node,
    render: (node) => render`
        ${render.node(node)} is already defined in this type.

        Try renaming this field.
    `,
});

registerFeedback({
    id: "duplicate-variant-definition",
    query: queries.duplicateVariantDefinition,
    on: (node) => node,
    render: (node) => render`
        ${render.node(node)} is already defined in this type.

        Try renaming this variant.
    `,
});
