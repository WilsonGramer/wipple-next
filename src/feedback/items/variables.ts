import { IsUnresolvedVariable, ResolvedVariable } from "../../visit/expressions/variable";
import { render } from "../render";
import { registerFeedback } from "../register";
import { IsVariablePattern } from "../../visit/patterns/variable";

registerFeedback({
    id: "undefined-variable",
    query: function* (db) {
        for (const [variable] of db.list(IsUnresolvedVariable)) {
            yield { variable };
        }
    },
    on: ({ variable }) => variable,
    render: ({ variable }) => render`
        Can't find ${variable}.

        Double-check your spelling, or use ${render.code(":")} to create a new variable with this name.
    `,
});

registerFeedback({
    id: "unused-variable",
    query: function* (db) {
        for (const [variable] of db.list(IsVariablePattern)) {
            if (!db.has(ResolvedVariable, variable)) {
                yield { variable };
            }
        }
    },
    on: ({ variable }) => variable,
    render: ({ variable }) => render`
        ${variable} is never used.

        If you don't need this variable, you can remove it.
    `,
});
