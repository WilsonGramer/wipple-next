import { render } from "../render";
import { registerFeedback } from "../register";
import { HasType } from "../../compile";
import { typeReferencesNode } from "../../typecheck/constraints/type";
import { Node } from "../../db";
import { IsTyped } from "../../visit";
import * as queries from "../../queries";

registerFeedback({
    id: "conflicting-types",
    query: queries.conflictingTypes,
    on: ({ source, node }) => source ?? node,
    render: ({ source, node, types, nodes }) => render`
        ${source != null ? `In ${source}, ` : ""}${node} is ${render.list(types.map(render.type), "or")}, but it can only be one of these.

        ${nodes.length > 0 ? `${node} must be the same type as ${render.list(nodes, "and")}; double-check these.` : ""}
    `,
});

registerFeedback({
    id: "incomplete-type",
    query: queries.incompleteType,
    on: ({ node }) => node,
    render: ({ node, type }) => render`
        Missing information for the type of ${node}.

        Wipple determined this code is ${render.type(type)}, but it needs some more information for the ${render.code("_")} placeholders.
    `,
});

registerFeedback({
    id: "unknown-type",
    query: queries.unknownType,
    on: ({ node }) => node,
    render: ({ node }) => render`
        Could not determine the type of ${node}.

        Wipple needs to know the type of this code before running it. Try using a function or assigning it to a variable.
    `,
});
