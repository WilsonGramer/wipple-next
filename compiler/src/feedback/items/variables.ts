import { render } from "../render";
import { registerFeedback } from "../register";
import * as queries from "../../queries";

registerFeedback({
    id: "undefined-variable",
    query: queries.undefinedVariable,
    on: ({ variable }) => variable,
    render: ({ variable }) => render`
        Can't find ${variable}.

        Double-check your spelling, or use ${render.code(":")} to create a new variable with this name.
    `,
});

registerFeedback({
    id: "unused-variable",
    query: queries.unusedVariable,
    on: ({ variable }) => variable,
    render: ({ variable }) => render`
        ${variable} is never used.

        If you don't need this variable, you can remove it.
    `,
});
