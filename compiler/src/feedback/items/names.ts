import * as queries from "../../queries";
import { registerFeedback } from "../register";
import { render } from "../render";

registerFeedback({
    id: "unresolved",
    query: queries.unresolved,
    on: (node) => node,
    render: (_node, { name }) => render`
        Can't find ${render.code(name)}.

        Double-check your spelling.
    `,
});

registerFeedback({
    id: "ambiguous",
    query: queries.ambigious,
    on: (node) => node,
    render: (_node, { name, definitions }) => render`
        ${render.code(name)} could refer to ${render.list(
            definitions.map((definition) => render.node(definition.node)),
            "or",
        )}.

        Rename the extra definitions.
    `,
});
