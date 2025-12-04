import * as queries from "../../queries";
import { registerFeedback } from "../register";
import { render } from "../render";

registerFeedback({
    id: "syntax-error",
    query: queries.syntaxError,
    on: (node) => node,
    render: (_node, { message }) => render`
        ${render.string(message)}.

        Check your spelling.
    `,
});
