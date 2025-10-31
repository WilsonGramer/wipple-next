import { render } from "../render";
import { registerFeedback } from "../register";
import * as queries from "../../queries";

registerFeedback({
    id: "undefined-variable",
    query: queries.unresolvedVariable,
    on: ({ variable }) => variable,
    render: ({ variable }) => render`
        Can't find ${variable}.

        Double-check your spelling, or use ${render.code(
            ":"
        )} to create a new variable with this name.
    `,
});

registerFeedback({
    id: "undefined-trait",
    query: queries.unresolvedBoundConstraint,
    on: ({ constraint }) => constraint,
    render: ({ constraint }) => render`
        Can't find a trait named ${constraint}.

        Double-check your spelling.
    `,
});

registerFeedback({
    id: "undefined-constructor",
    query: queries.unresolvedConstructor,
    on: ({ constructor }) => constructor,
    render: ({ constructor }) => render`
        Can't find a type or variant named ${constructor}.

        Double-check your spelling.
    `,
});

registerFeedback({
    id: "undefined-structure",
    query: queries.unresolvedStructureExpression,
    on: ({ constructor }) => constructor,
    render: ({ constructor }) => render`
        Can't find a structure type named ${constructor}.

        Double-check your spelling.
    `,
});

registerFeedback({
    id: "undefined-type",
    query: queries.unresolvedNamedType,
    on: ({ type }) => type,
    render: ({ type }) => render`
        Can't find a type named ${type}.

        Double-check your spelling.
    `,
});

registerFeedback({
    id: "undefined-type-parameter",
    query: queries.unresolvedParameterType,
    on: ({ type }) => type,
    render: ({ type }) => render`
        Can't find a type parameter named ${type}.

        Make sure the parameter is introduced using ${render.code("=>")}.
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
