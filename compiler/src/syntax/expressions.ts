import type { Parser } from "./parser";
import {
    parseConstructorName,
    parseNumber,
    parseString,
    parseTypeName,
    parseVariableName,
} from "./atoms";
import { parseAtomicPattern, parsePattern, parsePatternElement } from "./patterns";
import { parseTypeElement } from "./types";
import { parseStatements } from "./statements";
import type { ExpressionNode } from "../nodes/expressions";
import { AnnotateExpressionNode } from "../nodes/expressions/annotate";
import { AsExpressionNode } from "../nodes/expressions/as";
import { BlockExpressionNode } from "../nodes/expressions/block";
import { CallExpressionNode } from "../nodes/expressions/call";
import { CollectionExpressionNode } from "../nodes/expressions/collection";
import { ConstructorExpressionNode } from "../nodes/expressions/constructor";
import { DoExpressionNode } from "../nodes/expressions/do";
import { FormatExpressionNode } from "../nodes/expressions/format";
import { FunctionExpressionNode } from "../nodes/expressions/function";
import { IntrinsicExpressionNode } from "../nodes/expressions/intrinsic";
import { IsExpressionNode } from "../nodes/expressions/is";
import { NumberExpressionNode } from "../nodes/expressions/number";
import { OperatorExpressionNode } from "../nodes/expressions/operator";
import { PlaceholderExpressionNode } from "../nodes/expressions/placeholder";
import { StringExpressionNode } from "../nodes/expressions/string";
import { StructureExpressionField, StructureExpressionNode } from "../nodes/expressions/structure";
import { TupleExpressionNode } from "../nodes/expressions/tuple";
import { UnitExpressionNode } from "../nodes/expressions/unit";
import { VariableExpressionNode } from "../nodes/expressions/variable";
import { Arm, WhenExpressionNode } from "../nodes/expressions/when";

export const parseExpression = (parser: Parser): ExpressionNode =>
    parser.alternatives<ExpressionNode>("expression", parseExpression, [
        parseFunctionExpression,
        parseTupleExpression,
        parseCollectionExpression,
        parseIsExpression,
        parseAsExpression,
        parseAnnotateExpression,
        parseOperatorExpression,
    ]);

export const parseExpressionElement = (parser: Parser): ExpressionNode =>
    parser.alternatives<ExpressionNode>("expression", parseExpressionElement, [
        parseFormatExpression,
        parseStructureExpression,
        parseCallExpression,
        parseDoExpression,
        parseWhenExpression,
        parseIntrinsicExpression,
        parseAtomicExpression,
    ]);

export const parseAtomicExpression = (parser: Parser): ExpressionNode =>
    parser.alternatives<ExpressionNode>("expression", parseAtomicExpression, [
        parsePlaceholderExpression,
        parseVariableExpression,
        parseConstructorExpression,
        parseNumberExpression,
        parseStringExpression,
        parseBlockExpression,
        parseUnitExpression,
        parseParenthesizedExpression,
    ]);

export const parseParenthesizedExpression = (parser: Parser) =>
    parser.delimited("leftParenthesis", "rightParenthesis", () => parseExpression(parser));

export const parsePlaceholderExpression = (parser: Parser) =>
    parser.spanned((span) => {
        parser.next("underscoreKeyword");
        return new PlaceholderExpressionNode(span());
    });

export const parseVariableExpression = (parser: Parser) =>
    parser.spanned((span) => new VariableExpressionNode(parseVariableName(parser), span()));

export const parseConstructorExpression = (parser: Parser) =>
    parser.spanned((span) => new ConstructorExpressionNode(parseConstructorName(parser), span()));

export const parseNumberExpression = (parser: Parser) =>
    parser.spanned((span) => new NumberExpressionNode(parseNumber(parser), span()));

export const parseStringExpression = (parser: Parser) =>
    parser.spanned((span) => new StringExpressionNode(parseString(parser), span()));

export const parseStructureExpression = (parser: Parser) =>
    parser.spanned((span) => {
        const name = parseTypeName(parser);
        const fields = parser.delimited("leftBrace", "rightBrace", () =>
            parseStructureExpressionFields(parser),
        );
        return new StructureExpressionNode(name, fields, span());
    });

export const parseStructureExpressionField = (parser: Parser) =>
    parser.spanned((span) => {
        const name = parseVariableName(parser);
        parser.next("assignOperator");
        parser.commit();
        const value = parseExpression(parser);
        return new StructureExpressionField(name, value, span());
    });

export const parseStructureExpressionFields = (parser: Parser) =>
    parser.many("field", parseStructureExpressionField, ["lineBreak"]);

export const parseBlockExpression = (parser: Parser) =>
    parser.spanned((span) => {
        const statements = parser.delimited("leftBrace", "rightBrace", () =>
            parser.optional(parseStatements, []),
        );
        return new BlockExpressionNode(statements, span());
    });

export const parseUnitExpression = (parser: Parser) =>
    parser.spanned((span) => {
        parser.delimited("leftParenthesis", "rightParenthesis", () => undefined);
        return new UnitExpressionNode(span());
    });

export const parseFormatExpression = (parser: Parser) =>
    parser.spanned((span) => {
        const string = parseString(parser);
        const inputs = parser.many("expression", parseAtomicExpression);
        return new FormatExpressionNode(string, inputs, span());
    });

export const parseCallExpression = (parser: Parser) =>
    parser.spanned((span) => {
        const func = parseAtomicExpression(parser);
        const inputs = parser.many("expression", parseAtomicExpression);
        return new CallExpressionNode(func, inputs, span());
    });

export const parseDoExpression = (parser: Parser) =>
    parser.spanned((span) => {
        parser.next("doKeyword");
        parser.commit();
        return new DoExpressionNode(parseAtomicExpression(parser), span());
    });

export const parseWhenExpression = (parser: Parser) =>
    parser.spanned((span) => {
        parser.next("whenKeyword");
        parser.commit();
        const input = parseAtomicExpression(parser);
        const arms = parser.delimited("leftBrace", "rightBrace", () =>
            parser.optional(parseArms, []),
        );
        return new WhenExpressionNode(input, arms, span());
    });

export const parseArm = (parser: Parser) =>
    parser.spanned((span) => {
        const pattern = parsePattern(parser);
        parser.next("functionOperator");
        const value = parseExpression(parser);
        return new Arm(pattern, value, span());
    });

export const parseArms = (parser: Parser) => parser.many("arm", parseArm, ["lineBreak"]);

export const parseIntrinsicExpression = (parser: Parser) =>
    parser.spanned((span) => {
        parser.next("intrinsicKeyword");
        parser.commit();
        const name = parseString(parser);
        const inputs = parser.optional(() => parser.many("expression", parseAtomicExpression), []);
        return new IntrinsicExpressionNode(name, inputs, span());
    });

const operatorParser =
    (
        operators: string[],
        associativity: "left" | "right",
        parseElement: (parser: Parser) => ExpressionNode,
    ) =>
    (parser: Parser) => {
        const [[first], ...rest] = parser.collection("expression", operators, parseElement, true);

        switch (associativity) {
            case "left": {
                return rest.reduce((left, [right, operator]) => {
                    const span = parser.join(left.span, right.span);
                    return new OperatorExpressionNode(operator!.value, left, right, span);
                }, first);
            }
            case "right": {
                return rest.reduceRight((right, [left, operator]) => {
                    const span = parser.join(left.span, right.span);
                    return new OperatorExpressionNode(operator!.value, left, right, span);
                }, first);
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
    parsePowerExpression,
);
const parseAddExpression = operatorParser(
    ["addOperator", "subtractOperator"],
    "left",
    parseMultiplyExpression,
);
const parseCompareExpression = operatorParser(
    [
        "lessThanOrEqualOperator",
        "lessThanOperator",
        "greaterThanOrEqualOperator",
        "greaterThanOperator",
    ],
    "left",
    parseAddExpression,
);
const parseEqualExpression = operatorParser(
    ["equalOperator", "notEqualOperator"],
    "left",
    parseCompareExpression,
);
const parseAndExpression = operatorParser(["andOperator"], "left", parseEqualExpression);
const parseOrExpression = operatorParser(["orOperator"], "left", parseAndExpression);
const parseApplyExpression = operatorParser(["applyOperator"], "left", parseOrExpression);

export const parseOperatorExpression = (parser: Parser) => parseApplyExpression(parser);

export const parseTupleExpression = (parser: Parser) =>
    parser.spanned((span) => {
        const elements = parser
            .collection("tuple", ["tupleOperator"], parseExpressionElement)
            .map(([element]) => element);
        return new TupleExpressionNode(elements, span());
    });

export const parseCollectionExpression = (parser: Parser) =>
    parser.spanned((span) => {
        const elements = parser
            .collection("collection", ["collectionOperator"], parseExpressionElement)
            .map(([element]) => element);
        return new CollectionExpressionNode(elements, span());
    });

export const parseIsExpression = (parser: Parser) =>
    parser.spanned((span) => {
        const left = parseExpressionElement(parser);
        parser.next("isOperator");
        parser.commit();
        const right = parsePatternElement(parser);
        return new IsExpressionNode(left, right, span());
    });

export const parseAsExpression = (parser: Parser) =>
    parser.spanned((span) => {
        const left = parseExpressionElement(parser);
        parser.next("asOperator");
        parser.commit();
        const right = parseTypeElement(parser);
        return new AsExpressionNode(left, right, span());
    });

export const parseAnnotateExpression = (parser: Parser) =>
    parser.spanned((span) => {
        const left = parseExpressionElement(parser);
        parser.next("annotateOperator");
        parser.commit();
        const right = parseTypeElement(parser);
        return new AnnotateExpressionNode(left, right, span());
    });

export const parseFunctionExpression = (parser: Parser) =>
    parser.spanned((span) => {
        const inputs = parseFunctionExpressionInputs(parser);
        const output = parseExpression(parser);
        return new FunctionExpressionNode(inputs, output, span());
    });

export const parseFunctionExpressionInputs = (parser: Parser) => {
    const inputs = parser.many("pattern", parseAtomicPattern);
    parser.next("functionOperator");
    parser.commit();
    return inputs;
};
