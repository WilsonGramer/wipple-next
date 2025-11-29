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

registerFeedback({
    id: "missing-type",
    query: queries.missingType,
    on: (node) => node,
    render: (node, { parameter }) => render`
        ${render.node(node)} is missing a type for ${render.node(parameter)}.

        Try adding another type here, or double-check your parentheses.
    `,
});

registerFeedback({
    id: "extra-type",
    query: queries.extraType,
    on: (node) => node,
    render: (node) => render`
        ${render.node(node)} doesn't match any parameter of this type.

        Try removing this type, or double-check your parentheses.
    `,
});

registerFeedback({
    id: "conflicting-instances",
    query: queries.overlappingInstances,
    on: (node) => node,
    render: (node, { instances }) => render`
        ${render.node(node)} has multiple overlapping instances: ${render.list(
            instances.map((instance) => render.node(instance)),
            "and",
        )}.

        Only one of these instances can be defined at a time. Try making your instance more specific.
    `,
});
