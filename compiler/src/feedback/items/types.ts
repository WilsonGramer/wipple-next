import * as queries from "../../queries";
import { registerFeedback } from "../register";
import { render } from "../render";

registerFeedback({
    id: "conflicting-types",
    query: queries.conflictingTypes,
    on: (node, { source }) => source ?? node,
    render: (node, { source, nodes, types }) => render`
        ${render.optional(source && render`In ${render.node(source)}, `)}${render.node(
            node,
        )} is ${render.list(types.map(render.type), "or")}, but it can only be one of these.

        ${render.optional(
            nodes.length > 1
                ? render`${render.node(node)} must be the same type as ${render.list(
                      nodes.map(render.node),
                      "and",
                  )}; double-check these.`
                : undefined,
        )}
    `,
});

registerFeedback({
    id: "incomplete-type",
    query: queries.incompleteType,
    on: (node) => node,
    render: (node, { type }) => render`
        Missing information for the type of ${render.node(node)}.

        Wipple determined this code is ${render.type(
            type,
        )}, but it needs some more information for the ${render.code("_")} placeholders.
    `,
});

registerFeedback({
    id: "unknown-type",
    query: queries.unknownType,
    on: (node) => node,
    render: (node) => render`
        Could not determine the type of ${render.node(node)}.

        Wipple needs to know the type of this code before running it. Try using a function or assigning it to a variable.
    `,
});
