import { render } from "../render";
import { registerFeedback } from "../register";
import { HasType, InTypeGroup } from "../../compile";
import { typeReferencesNode } from "../../typecheck/constraints/type";
import { Node } from "../../db";
import { IsTyped } from "../../visit";

registerFeedback({
    id: "conflicting-types",
    query: function* (db, filter) {
        for (const node of db.nodes()) {
            const { instantiatedFrom, instantiatedBy: source } = node;

            const group = db.get(node, InTypeGroup);
            if (group == null) {
                continue;
            }

            if (group.types.length > 1) {
                yield {
                    source,
                    node: instantiatedFrom ?? node,
                    types: group.types,
                    nodes: group.nodes.values().filter(filter).toArray(),
                };
            }
        }
    },
    on: ({ source, node }) => source ?? node,
    render: ({ source, node, types, nodes }) => render`
        ${source != null ? `In ${source}, ` : ""}${node} is ${render.list(types.map(render.type), "or")}, but it can only be one of these.

        ${nodes.length > 0 ? `${node} must be the same type as ${render.list(nodes, "and")}; double-check these.` : ""}
    `,
});

registerFeedback({
    id: "incomplete-type",
    query: function* (db) {
        for (const [node, _] of db.list(IsTyped)) {
            const types = db.list(node, HasType).toArray();
            if (types.length === 1) {
                const [type] = types;

                if (!(type instanceof Node) && typeReferencesNode(type)) {
                    yield { node, type };
                }
            }
        }
    },
    on: ({ node }) => node,
    render: ({ node, type }) => render`
        Missing information for the type of ${node}.

        Wipple determined this code is ${render.type(type)}, but it needs some more information for the ${render.code("_")} placeholders.
    `,
});

registerFeedback({
    id: "unknown-type",
    query: function* (db) {
        for (const [node, _] of db.list(IsTyped)) {
            const types = db.list(node, HasType).toArray();
            if (types.length === 1) {
                const [type] = types;

                if (type instanceof Node) {
                    yield { node, type };
                }
            }
        }
    },
    on: ({ node }) => node,
    render: ({ node, type }) => render`
        Could not determine the type of ${node}.

        Wipple needs to know the type of this code before running it. Try using a function or assigning it to a variable.
    `,
});
