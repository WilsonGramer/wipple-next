import * as queries from "../../queries";
import { registerFeedback } from "../register";
import { render } from "../render";

registerFeedback({
    id: "syntax-error",
    query: queries.syntaxError,
    on: (node) => node,
    render: (_node, { expected }) => render`
        Expected ${render.string(expected)} here.

        Check your spelling.
    `,
});
