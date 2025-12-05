import { FileNode } from "../nodes";
import { AttributeNode } from "../nodes/attributes";
import { StringAttributeValue, type AttributeValue } from "../nodes/attributes/value";
import type { ConstraintNode } from "../nodes/constraints";
import { BoundConstraintNode } from "../nodes/constraints/bound";
import { DefaultConstraintNode } from "../nodes/constraints/default";
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
import type { PatternNode } from "../nodes/patterns";
import { AnnotatePatternNode } from "../nodes/patterns/annotate";
import { ConstructorPatternNode } from "../nodes/patterns/constructor";
import { NumberPatternNode } from "../nodes/patterns/number";
import { OrPatternNode } from "../nodes/patterns/or";
import { SetPatternNode } from "../nodes/patterns/set";
import { StringPatternNode } from "../nodes/patterns/string";
import { StructurePatternField, StructurePatternNode } from "../nodes/patterns/structure";
import { TuplePatternNode } from "../nodes/patterns/tuple";
import { UnitPatternNode } from "../nodes/patterns/unit";
import { VariablePatternNode } from "../nodes/patterns/variable";
import { WildcardPatternNode } from "../nodes/patterns/wildcard";
import type { StatementNode } from "../nodes/statements";
import { AssignmentNode } from "../nodes/statements/assignment";
import { ConstantDefinitionNode } from "../nodes/statements/constant-definition";
import { ExpressionStatementNode } from "../nodes/statements/expression";
import { InstanceDefinitionNode } from "../nodes/statements/instance-definition";
import { TraitDefinitionNode } from "../nodes/statements/trait-definition";
import {
    EnumerationTypeRepresentation,
    FieldDefinition,
    MarkerTypeRepresentation,
    StructureTypeRepresentation,
    TypeDefinitionNode,
    VariantDefinition,
    type TypeRepresentation,
} from "../nodes/statements/type-definition";
import type { TypeNode } from "../nodes/types";
import { BlockTypeNode } from "../nodes/types/block";
import { FunctionTypeNode } from "../nodes/types/function";
import { NamedTypeNode } from "../nodes/types/named";
import { TypeParameterNode } from "../nodes/types/parameter";
import { PlaceholderTypeNode } from "../nodes/types/placeholder";
import { TupleTypeNode } from "../nodes/types/tuple";
import { UnitTypeNode } from "../nodes/types/unit";
import type { TokenType } from "./lexer";
import type { Parser } from "./parser";

// File

export const parseFile = (parser: Parser) => {
    const span = parser.position();

    const frontMatter = undefined; // TODO

    const statements = parseStatements(parser);
    parseComments(parser);

    return new FileNode(frontMatter, statements, span());
};

// Statements

export const parseStatements = (parser: Parser) => parser.lines(() => parseStatement(parser));

export const parseStatement = (parser: Parser) =>
    parser.or<StatementNode>(
        parseStatement,
        [
            () => parseTypeDefinitionStatement(parser),
            () => parseTraitDefinitionStatement(parser),
            () => parseConstantDefinitionStatement(parser),
            () => parseInstanceDefinitionStatement(parser),
            () => parseAssignmentStatement(parser),
            () => parseExpressionStatement(parser),
        ],
        "Expected statement",
    );

export const parseTypeDefinitionStatement = (parser: Parser) => {
    const span = parser.position();

    const comments = parseComments(parser);
    const attributes = parseAttributes(parser);
    const name = parseTypeName(parser);
    parser.token("assignOperator");
    parser.consumeLineBreaks();

    const parameters = parser.try(() => parseTypeParameters(parser)) ?? [];

    const representation = parseTypeRepresentation(parser);

    return new TypeDefinitionNode(comments, attributes, name, parameters, representation, span());
};

export const parseTypeRepresentation = (parser: Parser) =>
    parser.or<TypeRepresentation>(
        parseTypeRepresentation,
        [
            () => parseStructureTypeRepresentation(parser),
            () => parseEnumerationTypeRepresentation(parser),
            () => parseMarkerTypeRepresentation(parser),
        ],
        "Expected type representation",
    );

export const parseStructureTypeRepresentation = (parser: Parser) => {
    const span = parser.position();

    parser.token("typeKeyword");

    parser.token("leftBrace");

    const fields = parser.linesN(1, () => parseFieldDefinition(parser));

    parser.token("rightBrace", reasons.closingBrace);

    return new StructureTypeRepresentation(fields, span());
};

export const parseFieldDefinition = (parser: Parser) => {
    const span = parser.position();

    const name = parseVariableName(parser);
    parser.commit("in this field definition");
    parser.commitToken("annotateOperator", "in this type annotation");
    parser.consumeLineBreaks();

    const type = parseType(parser);

    return new FieldDefinition(name, type, span());
};

export const parseEnumerationTypeRepresentation = (parser: Parser) => {
    const span = parser.position();

    parser.token("typeKeyword");

    parser.token("leftBrace");

    const variants = parser.linesN(1, () => parseVariantDefinition(parser));

    parser.token("rightBrace", reasons.closingBrace);

    return new EnumerationTypeRepresentation(variants, span());
};

export const parseMarkerTypeRepresentation = (parser: Parser) => {
    const span = parser.position();

    parser.commitToken("typeKeyword", "in this type definition");

    return new MarkerTypeRepresentation(span());
};

export const parseVariantDefinition = (parser: Parser) => {
    const span = parser.position();

    const name = parseConstructorName(parser);
    parser.commit("in this variant definition");

    const elements = parser.try(() => parser.many(() => parseAtomicType(parser), undefined)) ?? [];

    return new VariantDefinition(name, elements, span());
};

export const parseTraitDefinitionStatement = (parser: Parser) => {
    const span = parser.position();

    const comments = parseComments(parser);
    const attributes = parseAttributes(parser);
    const name = parseTypeName(parser);
    parser.token("assignOperator");
    parser.consumeLineBreaks();

    const parameters = parser.try(() => parseTypeParameters(parser)) ?? [];

    const { type, constraints } = parseTraitConstraints(parser);

    return new TraitDefinitionNode(
        comments,
        attributes,
        name,
        parameters,
        type,
        constraints,
        span(),
    );
};

export const parseTraitConstraints = (parser: Parser) => {
    parser.commitToken("traitKeyword", "in this trait definition");

    const type = parseAtomicType(parser);
    const constraints = parser.try(() => parseConstraints(parser)) ?? [];

    return { type, constraints };
};

export const parseConstantDefinitionStatement = (parser: Parser) => {
    const span = parser.position();

    const comments = parseComments(parser);
    const attributes = parseAttributes(parser);
    const name = parseVariableName(parser);

    const { type, constraints } = parseConstantConstraints(parser);

    return new ConstantDefinitionNode(comments, attributes, name, type, constraints, span());
};

export const parseConstantConstraints = (parser: Parser) => {
    parser.commitToken("annotateOperator", "in this constant definition");
    parser.consumeLineBreaks();

    const type = parseType(parser);
    const constraints = parser.try(() => parseConstraints(parser)) ?? [];

    return { type, constraints };
};

export const parseInstanceDefinitionStatement = (parser: Parser) => {
    const span = parser.position();

    const comments = parseComments(parser);
    const attributes = parseAttributes(parser);

    const { bound, constraints } = parseInstanceConstraints(parser);

    const value = parser.try(() => {
        parser.commitToken("assignOperator", "in this instance definition");
        parser.consumeLineBreaks();
        return parseExpression(parser);
    });

    return new InstanceDefinitionNode(comments, attributes, bound, constraints, value, span());
};

export const parseInstanceConstraints = (parser: Parser) => {
    parser.commitToken("instanceKeyword", "in this instance definition");

    const bound = parseBoundConstraint(parser);
    const constraints = parser.try(() => parseConstraints(parser)) ?? [];

    return { bound, constraints };
};

export const parseAssignmentStatement = (parser: Parser) => {
    const span = parser.position();

    const comments = parseComments(parser);
    const pattern = parsePattern(parser);

    parser.commitToken("assignOperator", "in this variable assignment");
    parser.consumeLineBreaks();

    const value = parseExpression(parser);

    return new AssignmentNode(comments, [], pattern, value, span());
};

export const parseExpressionStatement = (parser: Parser) => {
    const span = parser.position();

    const comments = parseComments(parser);
    const expression = parseExpression(parser);

    return new ExpressionStatementNode(comments, [], expression, span());
};

export const parseComments = (parser: Parser) => parser.lines(() => parseComment(parser));

// Expressions

export const parseExpression = (parser: Parser): ExpressionNode =>
    parser.or<ExpressionNode>(
        parseExpression,
        [
            () => parseFunctionExpression(parser),
            () => parseTupleExpression(parser),
            () => parseEmptyCollectionExpression(parser),
            () => parseCollectionExpression(parser),
            () => parseIsExpression(parser),
            () => parseAsExpression(parser),
            () => parseAnnotateExpression(parser),
            () => parseOperatorExpression(parser),
            () => parseExpressionElement(parser),
        ],
        "Expected expression",
    );

export const parseExpressionElement = (parser: Parser): ExpressionNode =>
    parser.or<ExpressionNode>(
        parseExpressionElement,
        [
            () => parseFormatExpression(parser),
            () => parseStructureExpression(parser),
            () => parseCallExpression(parser),
            () => parseDoExpression(parser),
            () => parseWhenExpression(parser),
            () => parseIntrinsicExpression(parser),
            () => parseAtomicExpression(parser),
        ],
        "Expected expression",
    );

export const parseAtomicExpression = (parser: Parser): ExpressionNode =>
    parser.or<ExpressionNode>(
        parseAtomicExpression,
        [
            () => parsePlaceholderExpression(parser),
            () => parseVariableExpression(parser),
            () => parseConstructorExpression(parser),
            () => parseNumberExpression(parser),
            () => parseStringExpression(parser),
            () => parseBlockExpression(parser),
            () => parseUnitExpression(parser),
            () => parseParenthesizedExpression(parser),
        ],
        "Expected expression",
    );

export const parseParenthesizedExpression = (parser: Parser) => {
    parser.token("leftParenthesis", "between these parentheses");
    parser.consumeLineBreaks();
    const value = parseExpression(parser);
    parser.consumeLineBreaks();
    parser.token("rightParenthesis", reasons.closingParenthesis);
    return value;
};

export const parsePlaceholderExpression = (parser: Parser) => {
    const span = parser.position();

    parser.commitToken("underscoreKeyword", "in this placeholder expression");

    return new PlaceholderExpressionNode(span());
};

export const parseVariableExpression = (parser: Parser) => {
    const span = parser.position();

    const name = parseVariableName(parser);

    return new VariableExpressionNode(name, span());
};

export const parseConstructorExpression = (parser: Parser) => {
    const span = parser.position();

    const name = parseConstructorName(parser);

    return new ConstructorExpressionNode(name, span());
};

export const parseNumberExpression = (parser: Parser) => {
    const span = parser.position();

    const value = parseNumber(parser);

    return new NumberExpressionNode(value, span());
};

export const parseStringExpression = (parser: Parser) => {
    const span = parser.position();

    const value = parseString(parser);

    return new StringExpressionNode(value, span());
};

export const parseStructureExpression = (parser: Parser) => {
    const span = parser.position();

    const name = parseTypeName(parser);

    parser.token("leftBrace");
    const fields = parseStructureExpressionFields(parser);
    parser.token("rightBrace", reasons.closingBrace);

    return new StructureExpressionNode(name, fields, span());
};

export const parseStructureExpressionField = (parser: Parser) => {
    const span = parser.position();

    const name = parseVariableName(parser);
    parser.token("assignOperator");
    parser.consumeLineBreaks();
    const value = parseExpression(parser);

    return new StructureExpressionField(name, value, span());
};

export const parseStructureExpressionFields = (parser: Parser) =>
    parser.linesN(1, () => parseStructureExpressionField(parser));

export const parseBlockExpression = (parser: Parser) => {
    const span = parser.position();

    parser.token("leftBrace");
    const statements = parseStatements(parser);
    parseComments(parser);
    parser.token("rightBrace", reasons.closingBrace);

    return new BlockExpressionNode(statements, span());
};

export const parseUnitExpression = (parser: Parser) => {
    const span = parser.position();

    parser.token("leftParenthesis", "between these parentheses");
    parser.token("rightParenthesis", reasons.closingParenthesis);

    return new UnitExpressionNode(span());
};

export const parseFormatExpression = (parser: Parser) => {
    const span = parser.position();

    const string = parseString(parser);
    const inputs = parser.manyN(1, () => parseAtomicExpression(parser), undefined);

    return new FormatExpressionNode(string, inputs, span());
};

export const parseCallExpression = (parser: Parser) => {
    const span = parser.position();

    const func = parseAtomicExpression(parser);
    const inputs = parser.manyN(1, () => parseAtomicExpression(parser), undefined);

    return new CallExpressionNode(func, inputs, span());
};

export const parseDoExpression = (parser: Parser) => {
    const span = parser.position();

    parser.commitToken("doKeyword", "in this `do` expression");

    const value = parseAtomicExpression(parser);

    return new DoExpressionNode(value, span());
};

export const parseWhenExpression = (parser: Parser) => {
    const span = parser.position();

    parser.commitToken("whenKeyword", "in this `when` expression");

    const input = parseAtomicExpression(parser);

    parser.token("leftBrace");
    const arms = parser.try(() => parseArms(parser)) ?? [];
    parser.token("rightBrace", reasons.closingBrace);

    return new WhenExpressionNode(input, arms, span());
};

export const parseArm = (parser: Parser) => {
    const span = parser.position();

    const pattern = parseAtomicPattern(parser);
    parser.commitToken("functionOperator", "in this `when` arm");
    parser.consumeLineBreaks();
    const value = parseExpression(parser);

    return new Arm(pattern, value, span());
};

export const parseArms = (parser: Parser) => parser.lines(() => parseArm(parser));

export const parseIntrinsicExpression = (parser: Parser) => {
    const span = parser.position();

    parser.commitToken("intrinsicKeyword", "in this `intrinsic` expression");

    const name = parseString(parser);
    const inputs =
        parser.try(() => parser.many(() => parseAtomicExpression(parser), undefined)) ?? [];

    return new IntrinsicExpressionNode(name, inputs, span());
};

const parseOperator = (
    parser: Parser,
    key: Function,
    operators: TokenType[],
    associativity: "left" | "right",
    parseElement: (parser: Parser) => ExpressionNode,
) => {
    const elements = parser.manyN(
        1,
        () => parseElement(parser),
        () => {
            parser.consumeLineBreaks();

            const operator = parser.or(
                key,
                operators.map((operator) => () => parser.token(operator)),
                "Expected operator",
            );

            parser.consumeLineBreaks();

            return operator;
        },
    );

    const [[, first], ...rest] = elements;

    switch (associativity) {
        case "left": {
            return rest.reduce((left, [operator, right]) => {
                const span = parser.join(left.span, right.span);
                return new OperatorExpressionNode(operator!.value, left, right, span);
            }, first);
        }
        case "right": {
            return rest.reduceRight((right, [operator, left]) => {
                const span = parser.join(left.span, right.span);
                return new OperatorExpressionNode(operator!.value, left, right, span);
            }, first);
        }
    }
};

// From highest precedence to lowest precedence

const parseToExpression = (parser: Parser) =>
    parseOperator(parser, parseToExpression, ["toOperator"], "left", parseExpressionElement);

const parseByExpression = (parser: Parser) =>
    parseOperator(parser, parseByExpression, ["byOperator"], "left", parseToExpression);

const parsePowerExpression = (parser: Parser) =>
    parseOperator(parser, parsePowerExpression, ["powerOperator"], "right", parseByExpression);

const parseMultiplyExpression = (parser: Parser) =>
    parseOperator(
        parser,
        parseMultiplyExpression,
        ["multiplyOperator", "divideOperator", "remainderOperator"],
        "left",
        parsePowerExpression,
    );

const parseAddExpression = (parser: Parser) =>
    parseOperator(
        parser,
        parseAddExpression,
        ["addOperator", "subtractOperator"],
        "left",
        parseMultiplyExpression,
    );

const parseCompareExpression = (parser: Parser) =>
    parseOperator(
        parser,
        parseCompareExpression,
        [
            "lessThanOrEqualOperator",
            "lessThanOperator",
            "greaterThanOrEqualOperator",
            "greaterThanOperator",
        ],
        "left",
        parseAddExpression,
    );

const parseEqualExpression = (parser: Parser) =>
    parseOperator(
        parser,
        parseEqualExpression,
        ["equalOperator", "notEqualOperator"],
        "left",
        parseCompareExpression,
    );

const parseAndExpression = (parser: Parser) =>
    parseOperator(parser, parseAndExpression, ["andOperator"], "left", parseEqualExpression);

const parseOrExpression = (parser: Parser) =>
    parseOperator(parser, parseOrExpression, ["orOperator"], "left", parseAndExpression);

const parseApplyExpression = (parser: Parser) =>
    parseOperator(parser, parseApplyExpression, ["applyOperator"], "left", parseOrExpression);

export const parseOperatorExpression = (parser: Parser) => parseApplyExpression(parser);

export const parseTupleExpression = (parser: Parser) => {
    const span = parser.position();

    const elements = parser
        .manyN(
            1,
            () => parseExpressionElement(parser),
            () => {
                parser.token("tupleOperator");
                parser.consumeLineBreaks();
            },
        )
        .map(([, element]) => element);

    if (elements.length === 1) {
        parser.token("tupleOperator");
    } else {
        parser.try(() => parser.token("tupleOperator"));
    }

    return new TupleExpressionNode(elements, span());
};

export const parseEmptyCollectionExpression = (parser: Parser) => {
    const span = parser.position();

    parser.token("collectionOperator");

    return new CollectionExpressionNode([], span());
};

export const parseCollectionExpression = (parser: Parser) => {
    const span = parser.position();

    const elements = parser
        .manyN(
            1,
            () => parseExpressionElement(parser),
            () => {
                parser.token("collectionOperator");
                parser.consumeLineBreaks();
            },
        )
        .map(([, element]) => element);

    if (elements.length === 1) {
        parser.token("collectionOperator");
    } else {
        parser.try(() => parser.token("collectionOperator"));
    }

    return new CollectionExpressionNode(elements, span());
};

export const parseIsExpression = (parser: Parser) => {
    const span = parser.position();

    const left = parseExpressionElement(parser);
    parser.token("isOperator");
    parser.consumeLineBreaks();
    const right = parsePatternElement(parser);

    return new IsExpressionNode(left, right, span());
};

export const parseAsExpression = (parser: Parser) => {
    const span = parser.position();

    const left = parseExpressionElement(parser);
    parser.token("asOperator");
    parser.consumeLineBreaks();
    const right = parseTypeElement(parser);

    return new AsExpressionNode(left, right, span());
};

export const parseAnnotateExpression = (parser: Parser) => {
    const span = parser.position();

    const left = parseExpressionElement(parser);
    parser.commitToken("annotateOperator", "in this type annotation");
    parser.consumeLineBreaks();
    const right = parseTypeElement(parser);

    return new AnnotateExpressionNode(left, right, span());
};

export const parseFunctionExpression = (parser: Parser) => {
    const span = parser.position();

    const inputs = parseFunctionExpressionInputs(parser);
    const output = parseExpression(parser);

    return new FunctionExpressionNode(inputs, output, span());
};

export const parseFunctionExpressionInputs = (parser: Parser) => {
    const inputs = parser.manyN(1, () => parseAtomicPattern(parser), undefined);

    parser.commitToken("functionOperator", "in this function");
    parser.consumeLineBreaks();

    return inputs;
};

// Patterns

export const parsePattern = (parser: Parser): PatternNode =>
    parser.or<PatternNode>(
        parsePattern,
        [
            () => parseTuplePattern(parser),
            () => parseOrPattern(parser),
            () => parseAnnotatePattern(parser),
            () => parsePatternElement(parser),
        ],
        "Expected pattern",
    );

export const parsePatternElement = (parser: Parser): PatternNode =>
    parser.or<PatternNode>(
        parsePatternElement,
        [
            () => parseStructurePattern(parser),
            () => parseParameterizedConstructorPattern(parser),
            () => parseSetPattern(parser),
            () => parseAtomicPattern(parser),
        ],
        "Expected pattern",
    );

export const parseAtomicPattern = (parser: Parser): PatternNode =>
    parser.or<PatternNode>(
        parseAtomicPattern,
        [
            () => parseConstructorPattern(parser),
            () => parseWildcardPattern(parser),
            () => parseVariablePattern(parser),
            () => parseNumberPattern(parser),
            () => parseStringPattern(parser),
            () => parseUnitPattern(parser),
            () => parseParenthesizedPattern(parser),
        ],
        "Expected pattern",
    );

export const parseParenthesizedPattern = (parser: Parser) => {
    parser.token("leftParenthesis", "between these parentheses");
    parser.consumeLineBreaks();
    const value = parsePattern(parser);
    parser.consumeLineBreaks();
    parser.token("rightParenthesis", reasons.closingParenthesis);
    return value;
};

export const parseWildcardPattern = (parser: Parser) => {
    const span = parser.position();

    parser.commitToken("underscoreKeyword", "in this wildcard pattern");

    return new WildcardPatternNode(span());
};

export const parseVariablePattern = (parser: Parser) => {
    const span = parser.position();

    const name = parseVariableName(parser);

    return new VariablePatternNode(name, span());
};

export const parseNumberPattern = (parser: Parser) => {
    const span = parser.position();

    const value = parseNumber(parser);

    return new NumberPatternNode(value, span());
};

export const parseStringPattern = (parser: Parser) => {
    const span = parser.position();

    const value = parseString(parser);

    return new StringPatternNode(value, span());
};

export const parseStructurePattern = (parser: Parser) => {
    const span = parser.position();

    const name = parseTypeName(parser);

    parser.token("leftBrace");

    const fields = parser.linesN(1, () => parseStructurePatternField(parser));

    parser.token("rightBrace", reasons.closingBrace);

    return new StructurePatternNode(name, fields, span());
};

export const parseStructurePatternField = (parser: Parser) => {
    const span = parser.position();

    const name = parseVariableName(parser);
    parser.token("assignOperator");
    parser.consumeLineBreaks();
    const value = parsePattern(parser);

    return new StructurePatternField(name, value, span());
};

export const parseParameterizedConstructorPattern = (parser: Parser) => {
    const span = parser.position();

    const constructor = parseConstructorName(parser);

    const elements =
        parser.try(() => parser.manyN(1, () => parseAtomicPattern(parser), undefined)) ?? [];

    return new ConstructorPatternNode(constructor, elements, span());
};

export const parseConstructorPattern = (parser: Parser) => {
    const span = parser.position();

    const constructor = parseConstructorName(parser);

    return new ConstructorPatternNode(constructor, [], span());
};

export const parseUnitPattern = (parser: Parser) => {
    const span = parser.position();

    parser.token("leftParenthesis", "between these parentheses");
    parser.token("rightParenthesis", reasons.closingParenthesis);

    return new UnitPatternNode(span());
};

export const parseTuplePattern = (parser: Parser) => {
    const span = parser.position();

    const elements = parser
        .manyN(
            1,
            () => parsePatternElement(parser),
            () => {
                parser.token("tupleOperator");
                parser.consumeLineBreaks();
            },
        )
        .map(([, element]) => element);

    if (elements.length === 1) {
        parser.token("tupleOperator");
    } else {
        parser.try(() => parser.token("tupleOperator"));
    }

    return new TuplePatternNode(elements, span());
};

export const parseOrPattern = (parser: Parser) => {
    const span = parser.position();

    const patterns = parser
        .manyN(
            2,
            () => parsePatternElement(parser),
            () => {
                parser.token("orOperator");
                parser.consumeLineBreaks();
            },
        )
        .map(([, element]) => element);

    return new OrPatternNode(patterns, span());
};

export const parseSetPattern = (parser: Parser) => {
    const span = parser.position();

    parser.commitToken("setKeyword", "in this `set` pattern");

    const name = parseVariableName(parser);

    return new SetPatternNode(name, span());
};

export const parseAnnotatePattern = (parser: Parser) => {
    const span = parser.position();

    const left = parsePatternElement(parser);
    parser.commitToken("annotateOperator", "in this type annotation");
    parser.consumeLineBreaks();
    const right = parseTypeElement(parser);

    return new AnnotatePatternNode(left, right, span());
};

// Types

export const parseType = (parser: Parser): TypeNode =>
    parser.or<TypeNode>(
        parseType,
        [
            () => parseTupleType(parser),
            () => parseFunctionType(parser),
            () => parseAnnotatedParameterType(parser),
            () => parseTypeElement(parser),
        ],
        "Expected type",
    );

export const parseTypeElement = (parser: Parser): TypeNode =>
    parser.or<TypeNode>(
        parseTypeElement,
        [() => parseParameterizedType(parser), () => parseAtomicType(parser)],
        "Expected type",
    );

export const parseAtomicType = (parser: Parser): TypeNode =>
    parser.or<TypeNode>(
        parseAtomicType,
        [
            () => parsePlaceholderType(parser),
            () => parseParameterType(parser),
            () => parseNamedType(parser),
            () => parseBlockType(parser),
            () => parseUnitType(parser),
            () => parseParenthesizedType(parser),
        ],
        "Expected type",
    );

export const parseParenthesizedType = (parser: Parser) => {
    parser.token("leftParenthesis", "between these parentheses");
    parser.consumeLineBreaks();
    const value = parseType(parser);
    parser.consumeLineBreaks();
    parser.token("rightParenthesis", reasons.closingParenthesis);
    return value;
};

export const parsePlaceholderType = (parser: Parser) => {
    const span = parser.position();

    parser.commitToken("underscoreKeyword", "in this placeholder type");

    return new PlaceholderTypeNode(span());
};

export const parseAnnotatedParameterType = (parser: Parser) => {
    const span = parser.position();

    const name = parseTypeParameterName(parser);
    parser.commitToken("annotateOperator", "in this type annotation");
    parser.consumeLineBreaks();
    const value = parseType(parser);

    return new TypeParameterNode(name, false, value, span());
};

export const parseParameterType = (parser: Parser) => {
    const span = parser.position();

    const name = parseTypeParameterName(parser);

    return new TypeParameterNode(name, false, undefined, span());
};

export const parseNamedType = (parser: Parser) => {
    const span = parser.position();

    const name = parseTypeName(parser);

    return new NamedTypeNode(name, [], span());
};

export const parseFunctionType = (parser: Parser) => {
    const span = parser.position();

    const inputs = parseFunctionTypeInputs(parser);
    const output = parseType(parser);

    return new FunctionTypeNode(inputs, output, span());
};

export const parseFunctionTypeInputs = (parser: Parser) => {
    const inputs = parser.manyN(1, () => parseAtomicType(parser), undefined);

    parser.commitToken("functionOperator", "in this function type");
    parser.consumeLineBreaks();

    return inputs;
};

export const parseBlockType = (parser: Parser) => {
    const span = parser.position();

    parser.token("leftBrace");
    const output = parseTypeElement(parser);
    parser.token("rightBrace", reasons.closingBrace);

    return new BlockTypeNode(output, span());
};

export const parseUnitType = (parser: Parser) => {
    const span = parser.position();

    parser.token("leftParenthesis", "between these parentheses");
    parser.token("rightParenthesis", reasons.closingParenthesis);

    return new UnitTypeNode(span());
};

export const parseTupleType = (parser: Parser) => {
    const span = parser.position();

    const elements = parser
        .manyN(
            1,
            () => parseTypeElement(parser),
            () => {
                parser.token("tupleOperator");
                parser.consumeLineBreaks();
            },
        )
        .map(([, element]) => element);

    if (elements.length === 1) {
        parser.token("tupleOperator");
    } else {
        parser.try(() => parser.token("tupleOperator"));
    }

    return new TupleTypeNode(elements, span());
};

export const parseParameterizedType = (parser: Parser) => {
    const span = parser.position();

    const name = parseTypeName(parser);
    const parameters = parser.manyN(1, () => parseAtomicType(parser), undefined);

    return new NamedTypeNode(name, parameters, span());
};

// Constraints

export const parseTypeParameters = (parser: Parser) => {
    const parameters = parser.many(() => parseTypeParameter(parser), undefined);

    if (parameters.length > 0) {
        parser.commitToken("typeFunctionOperator", "in this generic item");
        parser.consumeLineBreaks();
    }

    return parameters;
};

export const parseTypeParameter = (parser: Parser) =>
    parser.or<TypeParameterNode>(
        parseTypeParameter,
        [() => parseNamedTypeParameter(parser), () => parseInferTypeParameter(parser)],
        "Expected type parameter",
    );

export const parseNamedTypeParameter = (parser: Parser) => {
    const span = parser.position();

    const name = parseTypeParameterName(parser);

    return new TypeParameterNode(name, false, undefined, span());
};

export const parseInferTypeParameter = (parser: Parser) => {
    const span = parser.position();

    parser.token("leftParenthesis", "between these parentheses");
    parser.commitToken("inferKeyword", "in this inferred type parameter");
    const name = parseTypeParameterName(parser);
    parser.token("rightParenthesis", reasons.closingParenthesis);

    return new TypeParameterNode(name, true, undefined, span());
};

export const parseConstraints = (parser: Parser) => {
    parser.commitToken("whereKeyword", "in these constraints");

    return parser.many(() => parseConstraint(parser), undefined);
};

export const parseConstraint = (parser: Parser) =>
    parser.or<ConstraintNode>(
        parseConstraint,
        [() => parseBoundConstraint(parser), () => parseDefaultConstraint(parser)],
        "Expected constraint",
    );

export const parseBoundConstraint = (parser: Parser) => {
    const span = parser.position();

    parser.token("leftParenthesis", "between these parentheses");
    const trait = parseTypeName(parser);
    const parameters = parser.many(() => parseAtomicType(parser), undefined);
    parser.token("rightParenthesis", reasons.closingParenthesis);

    return new BoundConstraintNode(trait, parameters, span());
};

export const parseDefaultConstraint = (parser: Parser) => {
    const span = parser.position();

    parser.token("leftParenthesis", "between these parentheses");

    const parameterSpan = parser.position();
    const parameter = new TypeParameterNode(
        parseTypeParameterName(parser),
        false,
        undefined,
        parameterSpan(),
    );

    parser.commitToken("annotateOperator", "in this type annotation");
    parser.consumeLineBreaks();

    const value = parseType(parser);

    parser.token("rightParenthesis", reasons.closingParenthesis);

    return new DefaultConstraintNode(parameter, value, span());
};

// Attributes

export const parseAttributes = (parser: Parser) =>
    parser.lines(() => parseAttribute(parser), { requireLineBreaks: false });

export const parseAttribute = (parser: Parser) => {
    const span = parser.position();

    parser.token("leftBracket");
    const name = parseAttributeName(parser);

    const value = parser.try(() => {
        parser.token("assignOperator");
        parser.consumeLineBreaks();
        return parseAttributeValue(parser);
    });

    parser.token("rightBracket", reasons.closingBracket);

    return new AttributeNode(name, value, span());
};

export const parseAttributeValue = (parser: Parser) =>
    parser.or<AttributeValue>(
        parseAttributeValue,
        [() => parseStringAttributeValue(parser)],
        "Expected attribute value",
    );

export const parseStringAttributeValue = (parser: Parser) => {
    const span = parser.position();

    const value = parseString(parser);
    if (value == null) {
        parser.error("");
    }

    return new StringAttributeValue(value, span());
};

// Atoms

export const parseString = (parser: Parser) => parser.token("string").value;

export const parseNumber = (parser: Parser) => parser.token("number").value;

export const parseTypeName = (parser: Parser) =>
    parser.tokenWithName("capitalName", "a type name").value;

export const parseConstructorName = (parser: Parser) =>
    parser.tokenWithName("capitalName", "a constructor name").value;

export const parseVariableName = (parser: Parser) =>
    parser.tokenWithName("lowercaseName", "a variable name").value;

export const parseTypeParameterName = (parser: Parser) =>
    parser.tokenWithName("lowercaseName", "a type parameter name").value;

export const parseAttributeName = (parser: Parser) =>
    parser.or(
        parseAttributeName,
        [
            () => parser.tokenWithName("lowercaseName", "an attribute name").value,
            () => parser.token("intrinsicKeyword").value,
        ],
        "Expected attribute name",
    );

export const parseComment = (parser: Parser) => parser.token("comment").value;

// Reasons

const reasons = {
    closingParenthesis: "Every opening `(` must have a closing `)`.",
    closingBracket: "Every opening `[` must have a closing `]`.",
    closingBrace: "Every opening `{` must have a closing `}`.",
};
