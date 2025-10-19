import { Parser, LocationRange, Token } from "./parser";
import { parseTypeName, parseTypeParameterName } from "./tokens";
import { parseAtomicType, parseType, Type } from "./types";

export const parseTypeParameters = (parser: Parser): TypeParameter[] => {
    const parameters = parser.many("type parameter", parseTypeParameter);
    parser.next("typeFunctionOperator");
    return parameters;
};

export interface TypeParameter {
    infer?: boolean;
    name: Token;
}

export const parseTypeParameter = (parser: Parser): TypeParameter =>
    parser.alternatives("type parameter", [parseNamedTypeParameter, parseInferTypeParameter]);

const parseNamedTypeParameter = (parser: Parser): TypeParameter =>
    parser.withLocation(() => ({
        name: parseTypeParameterName(parser),
    }));

const parseInferTypeParameter = (parser: Parser): TypeParameter =>
    parser.withLocation(() =>
        parser.delimited("leftParenthesis", "rightParenthesis", () => {
            parser.next("inferKeyword");
            return {
                infer: true,
                name: parseTypeParameterName(parser),
            };
        }),
    );

export const parseConstraints = (parser: Parser): Constraint[] => {
    parser.next("whereKeyword");
    parser.commit();
    return parser.many("constraint", parseConstraint);
};

export type Constraint = BoundConstraint | DefaultConstraint;

let constraints: ((parser: Parser) => Constraint)[];
export const parseConstraint = (parser: Parser) => {
    if (constraints === undefined) {
        constraints = [parseBoundConstraint, parseDefaultConstraint];
    }

    return parser.alternatives<Constraint>("constraint", constraints);
};

export interface BoundConstraint {
    type: "bound";
    location: LocationRange;
    trait: Token;
    parameters: Type[];
}

export const parseBoundConstraint = (parser: Parser): BoundConstraint =>
    parser.withLocation(() =>
        parser.delimited("leftParenthesis", "rightParenthesis", () => ({
            type: "bound",
            trait: parseTypeName(parser),
            parameters: parser.many("type", parseAtomicType),
        })),
    );

export interface DefaultConstraint {
    type: "default";
    location: LocationRange;
    parameter: Type;
    value: Type;
}

export const parseDefaultConstraint = (parser: Parser): DefaultConstraint =>
    parser.withLocation(() =>
        parser.delimited("leftParenthesis", "rightParenthesis", () => {
            const parameter = parser.withLocation<Type>(() => ({
                type: "parameter",
                name: parseTypeParameterName(parser),
            }));
            parser.next("annotateOperator");
            parser.commit();
            return { type: "default", parameter, value: parseType(parser) };
        }),
    );
