import { render } from "../render";
import { registerFeedback } from "../register";
import * as queries from "../../queries";

registerFeedback({
    id: "unresolved",
    query: queries.unresolved,
    on: (node) => node,
    render: (_node, { name }) => render`
        Can't find ${render.code(name)}.

        Double-check your spelling.
    `,
});
