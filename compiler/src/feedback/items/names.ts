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
