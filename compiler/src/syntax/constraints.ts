import type { ConstraintNode } from "../nodes/constraints";
import { BoundConstraintNode } from "../nodes/constraints/bound";
import { DefaultConstraintNode } from "../nodes/constraints/default";
import { TypeParameterNode } from "../nodes/types/parameter";
import { parseTypeName, parseTypeParameterName } from "./atoms";
import type { Parser } from "./parser";
import { parseAtomicType, parseType } from "./types";

export const parseTypeParameters = (parser: Parser) => {
    const parameters = parser.many("type parameter", parseTypeParameter);
    parser.next("typeFunctionOperator");
    return parameters;
};

export const parseTypeParameter = (parser: Parser) =>
    parser.alternatives("type parameter", parseTypeParameter, [
        parseNamedTypeParameter,
        parseInferTypeParameter,
    ]);

export const parseNamedTypeParameter = (parser: Parser) =>
    parser.spanned("named type parameter", (span) => {
        const name = parseTypeParameterName(parser);
        return new TypeParameterNode(name, false, undefined, span());
    });

export const parseInferTypeParameter = (parser: Parser) =>
    parser.spanned("inferred type parameter", (span) => {
        const name = parser.delimited("leftParenthesis", "rightParenthesis", () => {
            parser.next("inferKeyword");
            return parseTypeParameterName(parser);
        });
        return new TypeParameterNode(name, true, undefined, span());
    });

export const parseConstraints = (parser: Parser) => {
    parser.next("whereKeyword");
    parser.commit();
    return parser.many("constraint", parseConstraint);
};

export const parseConstraint = (parser: Parser) =>
    parser.alternatives<ConstraintNode>("constraint", parseConstraint, [
        parseBoundConstraint,
        parseDefaultConstraint,
    ]);

export const parseBoundConstraint = (parser: Parser) =>
    parser.spanned("bound constraint", (span) =>
        parser.delimited("leftParenthesis", "rightParenthesis", () => {
            const trait = parseTypeName(parser);
            const parameters = parser.many("type", parseAtomicType);
            return new BoundConstraintNode(trait, parameters, span());
        }),
    );

export const parseDefaultConstraint = (parser: Parser) =>
    parser.spanned("default constraint", (span) =>
        parser.delimited("leftParenthesis", "rightParenthesis", () => {
            const parameter = parser.spanned(
                "type parameter",
                (span) =>
                    new TypeParameterNode(parseTypeParameterName(parser), false, undefined, span()),
            );
            parser.next("annotateOperator");
            parser.commit();
            const value = parseType(parser);
            return new DefaultConstraintNode(parameter, value, span());
        }),
    );
