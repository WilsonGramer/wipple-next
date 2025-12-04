import * as queries from "../../queries";
import { registerFeedback } from "../register";
import { render } from "../render";

registerFeedback({
    id: "syntax-error",
    query: queries.syntaxError,
    on: (node) => node,
    render: (_node, { message, committed, reason }) => render`
        ${render.optional(committed ? render` ${render.string(message)} ${render.string(committed)}` : render`${render.string(message)}`)}.

        ${render.optional(reason ? render`${render.string(reason)}` : undefined)}

        Check your spelling.
    `,
});
