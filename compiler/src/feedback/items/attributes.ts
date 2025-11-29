import * as queries from "../../queries";
import { registerFeedback } from "../register";
import { render } from "../render";

registerFeedback({
    id: "extra-attribute-value",
    query: queries.extraAttributeValue,
    on: (node) => node,
    render: (node) => render`
        ${render.node(node)} doesn't accept a value.

        Try removing the value from this attribute.
    `,
});

registerFeedback({
    id: "unsupported-attribute",
    query: queries.unsupportedAttribute,
    on: (node) => node,
    render: (node) => render`
        ${render.node(node)} is unsupported here.

        Try removing this attribute.
    `,
});

registerFeedback({
    id: "duplicate-attribute",
    query: queries.duplicateAttribute,
    on: (node) => node,
    render: (node) => render`
        ${render.node(node)} is defined more than once.

        Try removing this attribute.
    `,
});

registerFeedback({
    id: "missing-attribute-value",
    query: queries.missingAttributeValue,
    on: (node) => node,
    render: (node) => render`
        ${render.node(node)} is missing a value.

        Try adding a value to this attribute using ${render.code(":")}.
    `,
});
