import type { Interval, IterationNode, NonterminalNode, TerminalNode } from "ohm-js";
import { FileNode } from "../nodes";
import { AttributeNode } from "../nodes/attributes";
import { StringAttributeValue } from "../nodes/attributes/value";
import { BoundConstraintNode } from "../nodes/constraints/bound";
import { DefaultConstraintNode } from "../nodes/constraints/default";
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
} from "../nodes/statements/type-definition";
import { BlockTypeNode } from "../nodes/types/block";
import { FunctionTypeNode } from "../nodes/types/function";
import { NamedTypeNode } from "../nodes/types/named";
import { TypeParameterNode } from "../nodes/types/parameter";
import { PlaceholderTypeNode } from "../nodes/types/placeholder";
import { TupleTypeNode } from "../nodes/types/tuple";
import { UnitTypeNode } from "../nodes/types/unit";
import type { Span } from "../span";
import type { GrammarActionDict } from "./grammar.ohm-bundle";

declare module "ohm-js" {
    interface NonterminalNode {
        parse(): any;
    }
}

interface HasInterval {
    source: Interval;
}

type SpanFn = (node: HasInterval) => Span;

const parseOptional = (node: IterationNode) =>
    node.numChildren > 0 ? (node.children[0] as NonterminalNode).parse() : undefined;

const parseList = (node: IterationNode) =>
    node.children.map((child) => (child as NonterminalNode).parse());

const parseOptionalFirstRest = (first: IterationNode, rest: IterationNode) => {
    if (first.numChildren > 1) {
        throw new Error("expected optional children");
    } else {
        return [
            ...(first.numChildren > 0 ? [(first.children[0] as NonterminalNode).parse()] : []),
            ...parseList(rest),
        ];
    }
};

const parseFirstRest = (first: NonterminalNode, rest: IterationNode) => [
    first.parse(),
    ...parseList(rest),
];

const parseFrontMatter = (frontMatter: IterationNode) => frontMatter.sourceString.slice(4, -4);

const parseNumber = (number: TerminalNode) => number.sourceString;

const parseString = (string: TerminalNode) => string.sourceString.slice(1, -1);

const parseComment = (comment: TerminalNode) => comment.sourceString.slice(2).trim();

const parser = (span: SpanFn): GrammarActionDict<{}> => ({
    File(shebang, frontMatter, statements, comments, endLineBreak) {
        return new FileNode(parseFrontMatter(frontMatter), statements.parse(), span(this));
    },

    // Attributes

    Attributes(first, lineBreak, rest, trailingLineBreak) {
        return parseOptionalFirstRest(first, rest);
    },

    Attribute(
        leftBracket,
        leftLineBreak,
        name,
        assignOperator,
        value,
        rightLineBreak,
        rightBracket,
    ) {
        return new AttributeNode(name.parse(), parseOptional(value), span(this));
    },

    StringAttributeValue(string) {
        return new StringAttributeValue(parseString(string), span(string));
    },

    // Expressions
    ParenthesizedExpression(
        leftParenthesis,
        leftLineBreak,
        expression,
        rightLineBreak,
        rightParenthesis,
    ) {
        return expression.parse();
    },

    PlaceholderExpression(underscore) {
        return new PlaceholderExpressionNode(span(underscore));
    },

    VariableExpression(variableName) {
        return new VariableExpressionNode(variableName.parse(), span(variableName));
    },

    ConstructorExpression(constructorName) {
        return new ConstructorExpressionNode(constructorName.parse(), span(constructorName));
    },

    NumberExpression(number) {
        return new NumberExpressionNode(parseNumber(number), span(number));
    },

    StringExpression(string) {
        return new StringExpressionNode(parseString(string), span(string));
    },

    StructureExpression(
        typeName,
        leftBrace,
        leftLineBreak,
        firstField,
        fieldLineBreak,
        restFields,
        rightLineBreak,
        rightBrace,
    ) {
        return new StructureExpressionNode(
            typeName.parse(),
            parseFirstRest(firstField, restFields),
            span(this),
        );
    },

    StructureExpressionField(variableName, assignOperator, expression) {
        return new StructureExpressionField(variableName.parse(), expression.parse(), span(this));
    },

    BlockExpression(leftBrace, statements, comments, rightLineBreak, rightBrace) {
        return new BlockExpressionNode(statements.parse(), span(this));
    },

    UnitExpression(leftParenthesis, lineBreak, rightParenthesis) {
        return new UnitExpressionNode(span(this));
    },

    FormatExpression(string, expressions) {
        return new FormatExpressionNode(parseString(string), parseList(expressions), span(this));
    },

    CallExpression(func, inputs) {
        return new CallExpressionNode(func.parse(), parseList(inputs), span(this));
    },

    DoExpression(doKeyword, expression) {
        return new DoExpressionNode(expression.parse(), span(this));
    },

    WhenExpression(
        whenKeyword,
        expression,
        leftBrace,
        leftLineBreak,
        firstArm,
        armLineBreak,
        restArms,
        rightLineBreak,
        rightBrace,
    ) {
        return new WhenExpressionNode(
            expression.parse(),
            parseOptionalFirstRest(firstArm, restArms),
            span(this),
        );
    },

    Arm(pattern, functionOperator, expression) {
        return new Arm(pattern.parse(), expression.parse(), span(this));
    },

    IntrinsicExpression(intrinsicKeyword, string, expressions) {
        return new IntrinsicExpressionNode(parseString(string), parseList(expressions), span(this));
    },

    ToExpression_binary: operator(span),
    ByExpression_binary: operator(span),
    PowerExpression_binary: operator(span),
    MultiplyExpression_binary: operator(span),
    AddExpression_binary: operator(span),
    CompareExpression_binary: operator(span),
    EqualExpression_binary: operator(span),
    AndExpression_binary: operator(span),
    OrExpression_binary: operator(span),
    ApplyExpression_binary: operator(span),

    TupleExpression(first, tupleOperator, leftLineBreak, rest, rightLineBreak, trailingOperator) {
        return new TupleExpressionNode(parseOptionalFirstRest(first, rest), span(this));
    },

    EmptyCollectionExpression(collectionOperator) {
        return new CollectionExpressionNode([], span(collectionOperator));
    },

    CollectionExpression(head, leftLineBreak, collectionOperator, rightLineBreak, last) {
        return new CollectionExpressionNode(
            [
                ...parseList(head),
                ...(last.numChildren > 0 ? [(last.children[0] as NonterminalNode).parse()] : []),
            ],
            span(this),
        );
    },

    IsExpression(expression, isOperator, pattern) {
        return new IsExpressionNode(expression.parse(), pattern.parse(), span(this));
    },

    AsExpression(expression, asOperator, type) {
        return new AsExpressionNode(expression.parse(), type.parse(), span(this));
    },

    AnnotateExpression(expression, annotateOperator, type) {
        return new AnnotateExpressionNode(expression.parse(), type.parse(), span(this));
    },

    FunctionExpression(inputs, expression) {
        return new FunctionExpressionNode(inputs.parse(), expression.parse(), span(this));
    },

    FunctionExpressionInputs(patterns, functionOperator, lineBreak) {
        return parseList(patterns);
    },

    // Patterns
    ParenthesizedPattern(
        leftParenthesis,
        leftLineBreak,
        pattern,
        rightLineBreak,
        rightParenthesis,
    ) {
        return pattern.parse();
    },

    WildcardPattern(underscoreKeyword) {
        return new WildcardPatternNode(span(underscoreKeyword));
    },

    VariablePattern(variableName) {
        return new VariablePatternNode(variableName.parse(), span(variableName));
    },

    NumberPattern(number) {
        return new NumberPatternNode(parseNumber(number), span(number));
    },

    StringPattern(string) {
        return new StringPatternNode(parseString(string), span(string));
    },

    StructurePattern(
        typeName,
        leftBrace,
        leftLineBreak,
        firstField,
        fieldLineBreak,
        restFields,
        rightLineBreak,
        rightBrace,
    ) {
        return new StructurePatternNode(
            typeName.parse(),
            parseFirstRest(firstField, restFields),
            span(this),
        );
    },

    StructurePatternField(variableName, assignOperator, pattern) {
        return new StructurePatternField(variableName.parse(), pattern.parse(), span(this));
    },

    UnitPattern(leftParenthesis, lineBreak, rightParenthesis) {
        return new UnitPatternNode(span(this));
    },

    TuplePattern(first, tupleOperator, leftLineBreak, rest, rightLineBreak, trailingOperator) {
        return new TuplePatternNode(parseOptionalFirstRest(first, rest), span(this));
    },

    OrPattern(first, orOperator, leftLineBreak, rest, rightLineBreak) {
        return new OrPatternNode(parseOptionalFirstRest(first, rest), span(this));
    },

    SetPattern(setKeyword, variableName) {
        return new SetPatternNode(variableName.parse(), span(this));
    },

    ConstructorPattern(constructorName, patterns) {
        return new ConstructorPatternNode(constructorName.parse(), parseList(patterns), span(this));
    },

    AnnotatePattern(pattern, annotateOperator, type) {
        return new AnnotatePatternNode(pattern.parse(), type.parse(), span(this));
    },

    // Types
    ParenthesizedType(leftParenthesis, leftLineBreak, type, rightLineBreak, rightParenthesis) {
        return type.parse();
    },

    PlaceholderType(underscoreKeyword) {
        return new PlaceholderTypeNode(span(underscoreKeyword));
    },

    ParameterType(typeParameterName) {
        return new TypeParameterNode(
            typeParameterName.parse(),
            false,
            undefined,
            span(typeParameterName),
        );
    },

    AnnotatedParameterType(typeParameterName, annotateOperator, type) {
        return new TypeParameterNode(typeParameterName.parse(), false, type.parse(), span(this));
    },

    NamedType(typeName) {
        return new NamedTypeNode(typeName.parse(), [], span(typeName));
    },

    FunctionType(inputs, type) {
        return new FunctionTypeNode(inputs.parse(), type.parse(), span(this));
    },

    FunctionTypeInputs(types, functionOperator, lineBreak) {
        return parseList(types);
    },

    BlockType(leftBrace, leftLineBreak, type, rightLineBreak, rightBrace) {
        return new BlockTypeNode(type.parse(), span(this));
    },

    UnitType(leftParenthesis, lineBreak, rightParenthesis) {
        return new UnitTypeNode(span(this));
    },

    TupleType(first, tupleOperator, leftLineBreak, rest, rightLineBreak, trailingOperator) {
        return new TupleTypeNode(parseOptionalFirstRest(first, rest), span(this));
    },

    ParameterizedType(typeName, types) {
        return new NamedTypeNode(typeName.parse(), parseList(types), span(this));
    },

    // Constraints

    TypeParameters(typeParameters, typeFunctionOperator) {
        return parseList(typeParameters);
    },

    NamedTypeParameter(typeParameterName) {
        return new TypeParameterNode(
            typeParameterName.parse(),
            false,
            undefined,
            span(typeParameterName),
        );
    },

    InferTypeParameter(
        leftParenthesis,
        leftLineBreak,
        inferKeyword,
        typeParameterName,
        rightLineBreak,
        rightParenthesis,
    ) {
        return new TypeParameterNode(typeParameterName.parse(), true, undefined, span(this));
    },

    Constraints(whereKeyword, constraints) {
        return parseList(constraints);
    },

    BoundConstraint(
        leftParenthesis,
        leftLineBreak,
        typeName,
        types,
        rightLineBreak,
        rightParenthesis,
    ) {
        return new BoundConstraintNode(typeName.parse(), parseList(types), span(this));
    },

    DefaultConstraint(
        leftParenthesis,
        leftLineBreak,
        typeName,
        annotateOperator,
        type,
        rightLineBreak,
        rightParenthesis,
    ) {
        return new DefaultConstraintNode(typeName.parse(), type.parse(), span(this));
    },

    // Statements

    Statements(lineBreak, statements) {
        return parseList(statements);
    },

    TypeDefinitionStatement(
        comments,
        attributes,
        typeName,
        assignOperator,
        typeParameters,
        typeRepresentation,
    ) {
        return new TypeDefinitionNode(
            comments.parse(),
            attributes.parse(),
            typeName.parse(),
            parseOptional(typeParameters) ?? [],
            typeRepresentation.parse(),
            span(this),
        );
    },

    MarkerTypeRepresentation(typeKeyword) {
        return new MarkerTypeRepresentation(span(typeKeyword));
    },

    StructureTypeRepresentation(
        typeKeyword,
        leftBrace,
        leftLineBreak,
        firstField,
        fieldLineBreak,
        restFields,
        rightLineBreak,
        rightBrace,
    ) {
        return new StructureTypeRepresentation(parseFirstRest(firstField, restFields), span(this));
    },

    FieldDefinition(variableName, annotateOperator, type) {
        return new FieldDefinition(variableName.parse(), type.parse(), span(this));
    },

    EnumerationTypeRepresentation(
        typeKeyword,
        leftBrace,
        leftLineBreak,
        firstVariant,
        variantLineBreak,
        restVariants,
        rightLineBreak,
        rightBrace,
    ) {
        return new EnumerationTypeRepresentation(
            parseFirstRest(firstVariant, restVariants),
            span(this),
        );
    },

    VariantDefinition(constructorName, types) {
        return new VariantDefinition(constructorName.parse(), parseList(types), span(this));
    },

    TraitDefinitionStatement(
        comments,
        attributes,
        typeName,
        assignOperator,
        typeParameters,
        traitConstraints,
    ) {
        const { type, constraints } = traitConstraints.parse();

        return new TraitDefinitionNode(
            comments.parse(),
            attributes.parse(),
            typeName.parse(),
            parseOptional(typeParameters) ?? [],
            type,
            constraints,
            span(this),
        );
    },

    TraitConstraints(traitKeyword, type, constraints) {
        return {
            type: type.parse(),
            constraints: parseOptional(constraints) ?? [],
        };
    },

    ConstantDefinitionStatement(comments, attributes, variableName, constantConstraints) {
        const { type, constraints } = constantConstraints.parse();

        return new ConstantDefinitionNode(
            comments.parse(),
            attributes.parse(),
            variableName.parse(),
            type,
            constraints,
            span(this),
        );
    },

    ConstantConstraints(annotateOperator, type, constraints) {
        return {
            type: type.parse(),
            constraints: parseOptional(constraints) ?? [],
        };
    },

    InstanceDefinitionStatement(comments, attributes, instanceConstraints, assignOperator, value) {
        const { bound, constraints } = instanceConstraints.parse();

        return new InstanceDefinitionNode(
            comments.parse(),
            attributes.parse(),
            bound,
            constraints,
            parseOptional(value),
            span(this),
        );
    },

    InstanceConstraints(instanceKeyword, bound, constraints) {
        return {
            bound: bound.parse(),
            constraints: parseOptional(constraints) ?? [],
        };
    },

    AssignmentStatement(comments, pattern, assignOperator, expression) {
        return new AssignmentNode(
            comments.parse(),
            [],
            pattern.parse(),
            expression.parse(),
            span(this),
        );
    },

    ExpressionStatement(comments, expression) {
        return new ExpressionStatementNode(comments.parse(), [], expression.parse(), span(this));
    },

    Comments(comments, lineBreak) {
        return comments.children.map(parseComment);
    },

    // Atoms

    Number(value) {
        return parseNumber(value);
    },

    String(value) {
        return parseString(value);
    },

    TypeName(value) {
        return value.sourceString;
    },

    ConstructorName(value) {
        return value.sourceString;
    },

    VariableName(value) {
        return value.sourceString;
    },

    TypeParameterName(value) {
        return value.sourceString;
    },

    AttributeName(value) {
        return value.sourceString;
    },
});

const operator = (span: SpanFn) =>
    function (
        this: NonterminalNode,
        left: NonterminalNode,
        leftLineBreak: IterationNode,
        operator: TerminalNode,
        rightLineBreak: IterationNode,
        right: NonterminalNode,
    ) {
        return new OperatorExpressionNode(
            operator.sourceString,
            left.parse(),
            right.parse(),
            span(this),
        );
    };

export default parser;
