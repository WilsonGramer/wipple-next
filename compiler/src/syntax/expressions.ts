import { Parser, LocationRange, SyntaxError, Token } from "./parser";
import { Pattern, parsePattern, parsePatternElement, parseAtomicPattern } from "./patterns";
import { Type, parseTypeElement } from "./types";
import { Statement, parseStatements } from "./statements";
import { parseNumber, parseString, parseTypeName, parseVariableName } from "./tokens";

export type Expression =
    | FunctionExpression
    | TupleExpression
    | CollectionExpression
    | IsExpression
    | AsExpression
    | AnnotateExpression
    | OperatorExpression
    | FormatExpression
    | CallExpression
    | DoExpression
    | WhenExpression
    | IntrinsicExpression
    | PlaceholderExpression
    | VariableExpression
    | ConstructorExpression
    | NumberExpression
    | StringExpression
    | StructureExpression
    | BlockExpression
    | UnitExpression;

export const parseExpression = (parser: Parser): Expression =>
    parser.alternatives<Expression>("expression", [
        parseFunctionExpression,
        parseTupleExpression,
        parseCollectionExpression,
        parseIsExpression,
        parseAsExpression,
        parseAnnotateExpression,
        parseOperatorExpression,
    ]);

export const parseExpressionElement = (parser: Parser): Expression =>
    parser.alternatives<Expression>("expression", [
        parseFormatExpression,
        parseStructureExpression,
        parseCallExpression,
        parseDoExpression,
        parseWhenExpression,
        parseIntrinsicExpression,
        parseAtomicExpression,
    ]);

export const parseAtomicExpression = (parser: Parser): Expression =>
    parser.alternatives<Expression>("expression", [
        parsePlaceholderExpression,
        parseVariableExpression,
        parseConstructorExpression,
        parseNumberExpression,
        parseStringExpression,
        parseBlockExpression,
        parseUnitExpression,
        parseParenthesizedExpression,
    ]);

export const parseParenthesizedExpression = (parser: Parser): Expression =>
    parser.withLocation(() =>
        parser.delimited("leftParenthesis", "rightParenthesis", () => parseExpression(parser))
    );

export interface PlaceholderExpression {
    type: "placeholder";
    location: LocationRange;
}

export const parsePlaceholderExpression = (parser: Parser): PlaceholderExpression =>
    parser.withLocation(() => {
        parser.next("underscoreKeyword");
        return { type: "placeholder" };
    });

export interface VariableExpression {
    type: "variable";
    location: LocationRange;
    variable: Token;
}

export const parseVariableExpression = (parser: Parser): VariableExpression =>
    parser.withLocation(() => ({
        type: "variable",
        variable: parseVariableName(parser),
    }));

export interface ConstructorExpression {
    type: "constructor";
    location: LocationRange;
    trait: Token;
}

export const parseConstructorExpression = (parser: Parser): ConstructorExpression =>
    parser.withLocation(() => ({
        type: "constructor",
        trait: parseTypeName(parser),
    }));

export interface NumberExpression {
    type: "number";
    location: LocationRange;
    value: Token;
}

export const parseNumberExpression = (parser: Parser): NumberExpression =>
    parser.withLocation(() => ({
        type: "number",
        value: parseNumber(parser),
    }));

export interface StringExpression {
    type: "string";
    location: LocationRange;
    value: Token;
}

export const parseStringExpression = (parser: Parser): StringExpression =>
    parser.withLocation(() => ({
        type: "string",
        value: parseString(parser),
    }));

export interface StructureExpression {
    type: "structure";
    location: LocationRange;
    name: Token;
    fields: StructureExpressionField[];
}

export const parseStructureExpression = (parser: Parser): StructureExpression =>
    parser.withLocation(() =>
        parser.allowingLineBreaks(false, () => {
            const name = parseTypeName(parser);
            return parser.delimited("leftBrace", "rightBrace", () => ({
                type: "structure",
                name,
                fields: parseStructureExpressionFields(parser),
            }));
        })
    );

export interface StructureExpressionField {
    location: LocationRange;
    name: Token;
    value: Expression;
}

export const parseStructureExpressionField = (parser: Parser): StructureExpressionField =>
    parser.withLocation(() => {
        const name = parseVariableName(parser);
        parser.next("assignOperator");
        parser.commit();
        const value = parseExpression(parser);
        return { name, value };
    });

export const parseStructureExpressionFields = (parser: Parser): StructureExpressionField[] => {
    return parser.allowingLineBreaks(false, () =>
        parser.many("field", parseStructureExpressionField, "lineBreak")
    );
};

export interface BlockExpression {
    type: "block";
    location: LocationRange;
    statements: Statement[];
}

export const parseBlockExpression = (parser: Parser): BlockExpression =>
    parser.withLocation(() =>
        parser.delimited("leftBrace", "rightBrace", () => {
            parser.commit();
            return {
                type: "block",
                statements: parser.optional("statements", parseStatements, []),
            };
        })
    );

export interface UnitExpression {
    type: "unit";
    location: LocationRange;
}

export const parseUnitExpression = (parser: Parser): UnitExpression =>
    parser.withLocation(() =>
        parser.delimited("leftParenthesis", "rightParenthesis", () => ({
            type: "unit",
        }))
    );

export interface FormatExpression {
    type: "format";
    location: LocationRange;
    string: Token;
    inputs: Expression[];
}

export const parseFormatExpression = (parser: Parser): FormatExpression =>
    parser.withLocation(() =>
        parser.allowingLineBreaks(false, () => {
            const string = parseString(parser);
            const inputs = parser.many("expression", parseAtomicExpression);
            return { type: "format", string, inputs };
        })
    );

export interface CallExpression {
    type: "call";
    location: LocationRange;
    function: Expression;
    inputs: Expression[];
}

export const parseCallExpression = (parser: Parser): CallExpression =>
    parser.withLocation(() =>
        parser.allowingLineBreaks(false, () => ({
            type: "call",
            function: parseAtomicExpression(parser),
            inputs: parser.many("expression", parseAtomicExpression),
        }))
    );

export interface DoExpression {
    type: "do";
    location: LocationRange;
    input: Expression;
}

export const parseDoExpression = (parser: Parser): DoExpression =>
    parser.withLocation(() =>
        parser.allowingLineBreaks(false, () => {
            parser.next("doKeyword");
            parser.commit();
            return { type: "do", input: parseAtomicExpression(parser) };
        })
    );

export interface WhenExpression {
    type: "when";
    location: LocationRange;
    input: Expression;
    arms: Arm[];
}

export const parseWhenExpression = (parser: Parser): WhenExpression =>
    parser.withLocation(() =>
        parser.allowingLineBreaks(false, () => {
            parser.next("whenKeyword");
            parser.commit();
            return {
                type: "when",
                input: parseAtomicExpression(parser),
                arms: parser.delimited("leftBrace", "rightBrace", () =>
                    parser.optional("arms", parseArms, [])
                ),
            };
        })
    );

export interface Arm {
    location: LocationRange;
    pattern: Pattern;
    value: Expression;
}

export const parseArm = (parser: Parser): Arm =>
    parser.withLocation(() =>
        parser.allowingLineBreaks(false, () => {
            const pattern = parsePattern(parser);
            parser.next("functionOperator");
            const value = parseExpression(parser);
            return { pattern, value };
        })
    );

export const parseArms = (parser: Parser): Arm[] =>
    parser.allowingLineBreaks(false, () => parser.many("arm", parseArm, "lineBreak"));

export interface IntrinsicExpression {
    type: "intrinsic";
    location: LocationRange;
    name: Token;
    inputs: Expression[];
}

export const parseIntrinsicExpression = (parser: Parser): IntrinsicExpression =>
    parser.withLocation(() =>
        parser.allowingLineBreaks(false, () => {
            parser.next("intrinsicKeyword");
            parser.commit();
            return {
                type: "intrinsic",
                name: parseString(parser),
                inputs: parser.optional(
                    "expressions",
                    () => parser.many("expression", parseAtomicExpression),
                    []
                ),
            };
        })
    );

export interface OperatorExpression {
    type: "operator";
    operator: string;
    location: LocationRange;
    left: Expression;
    right: Expression;
}

const operatorParser =
    (
        operators: string[],
        associativity: "left" | "right",
        parseElement: (parser: Parser) => Expression
    ) =>
    (parser: Parser): Expression => {
        const [[first], ...rest] = parser.collection("expression", operators, parseElement, true);

        const location = (left: Expression, right: Expression): LocationRange => ({
            source: parser.slice(left.location.start.offset, right.location.end.offset),
            start: left.location.start,
            end: right.location.end,
        });

        switch (associativity) {
            case "left": {
                return rest.reduce(
                    (left, [right, operator]) => ({
                        type: "operator",
                        location: location(left, right),
                        operator: operator!,
                        left,
                        right,
                    }),
                    first
                );
            }
            case "right": {
                return rest.reduceRight(
                    (right, [left, operator]) => ({
                        type: "operator",
                        location: location(left, right),
                        operator: operator!,
                        left,
                        right,
                    }),
                    first
                );
            }
        }
    };

// From highest precedence to lowest precedence
const parseToExpression = operatorParser(["toOperator"], "left", parseExpressionElement);
const parseByExpression = operatorParser(["byOperator"], "left", parseToExpression);
const parsePowerExpression = operatorParser(["powerOperator"], "right", parseByExpression);
const parseMultiplyExpression = operatorParser(
    ["multiplyOperator", "divideOperator", "remainderOperator"],
    "left",
    parsePowerExpression
);
const parseAddExpression = operatorParser(
    ["addOperator", "subtractOperator"],
    "left",
    parseMultiplyExpression
);
const parseCompareExpression = operatorParser(
    [
        "lessThanOrEqualOperator",
        "lessThanOperator",
        "greaterThanOrEqualOperator",
        "greaterThanOperator",
    ],
    "left",
    parseAddExpression
);
const parseEqualExpression = operatorParser(
    ["equalOperator", "notEqualOperator"],
    "left",
    parseCompareExpression
);
const parseAndExpression = operatorParser(["andOperator"], "left", parseEqualExpression);
const parseOrExpression = operatorParser(["orOperator"], "left", parseAndExpression);
const parseApplyExpression = operatorParser(["applyOperator"], "left", parseOrExpression);

export const parseOperatorExpression = (parser: Parser): Expression => parseApplyExpression(parser);

export interface TupleExpression {
    type: "tuple";
    location: LocationRange;
    elements: Expression[];
}

export const parseTupleExpression = (parser: Parser): TupleExpression =>
    parser.allowingLineBreaks(true, () =>
        parser.withLocation(() => ({
            type: "tuple",
            elements: parser
                .collection("tuple", ["tupleOperator"], parseExpressionElement)
                .map(([element]) => element),
        }))
    );

export interface CollectionExpression {
    type: "collection";
    location: LocationRange;
    elements: Expression[];
}

export const parseCollectionExpression = (parser: Parser): CollectionExpression =>
    parser.allowingLineBreaks(true, () =>
        parser.withLocation(() => ({
            type: "collection",
            elements: parser
                .collection("collection", ["collectionOperator"], parseExpressionElement)
                .map(([element]) => element),
        }))
    );

export interface IsExpression {
    type: "is";
    location: LocationRange;
    left: Expression;
    right: Pattern;
}

export const parseIsExpression = (parser: Parser): IsExpression =>
    parser.withLocation(() => {
        const left = parseExpressionElement(parser);
        parser.next("isOperator");
        parser.commit();
        const right = parsePatternElement(parser);
        return { type: "is", left, right };
    });

export interface AsExpression {
    type: "as";
    location: LocationRange;
    left: Expression;
    right: Type;
}

export const parseAsExpression = (parser: Parser): AsExpression =>
    parser.withLocation(() => {
        const left = parseExpressionElement(parser);
        parser.next("asOperator");
        parser.commit();
        const right = parseTypeElement(parser);
        return { type: "as", left, right };
    });

export interface AnnotateExpression {
    type: "annotate";
    location: LocationRange;
    left: Expression;
    right: Type;
}

export const parseAnnotateExpression = (parser: Parser): AnnotateExpression =>
    parser.withLocation(() => {
        const left = parseExpressionElement(parser);
        parser.next("annotateOperator");
        parser.commit();
        const right = parseTypeElement(parser);
        return { type: "annotate", left, right };
    });

export interface FunctionExpression {
    type: "function";
    location: LocationRange;
    inputs: Pattern[];
    output: Expression;
}

export const parseFunctionExpression = (parser: Parser): FunctionExpression =>
    parser.withLocation(() => ({
        type: "function",
        inputs: parseFunctionExpressionInputs(parser),
        output: parseExpression(parser),
    }));

export const parseFunctionExpressionInputs = (parser: Parser): Pattern[] =>
    parser.allowingLineBreaks(false, () => {
        const inputs = parser.many("pattern", parseAtomicPattern);
        parser.next("functionOperator");
        parser.commit();
        return inputs;
    });
