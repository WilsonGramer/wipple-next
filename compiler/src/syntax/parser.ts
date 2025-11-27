/* eslint-disable @typescript-eslint/no-unsafe-return */

import type { Interval, IterationNode, NonterminalNode } from "ohm-js";
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

type SpanFn = (left: HasInterval, right?: HasInterval) => Span;

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

const parseString = (string: NonterminalNode) => string.sourceString.slice(1, -1);

const parser = (span: SpanFn): GrammarActionDict<{}> => ({
    File: (statements, trailingLineBreak) => new FileNode(statements.parse(), span(statements)),

    // Attributes

    Attributes: (first, lineBreak, rest, trailingLineBreak) => parseOptionalFirstRest(first, rest),

    Attribute: (
        leftBracket,
        leftLineBreak,
        name,
        assignOperator,
        value,
        rightLineBreak,
        rightBracket,
    ) => new AttributeNode(name.parse(), parseOptional(value), span(leftBracket, rightBracket)),

    AttributeValue: (value) => value.parse(),

    StringAttributeValue: (string) => new StringAttributeValue(parseString(string), span(string)),

    // Expressions

    Expression: (expression) => expression.parse(),

    ExpressionElement: (expression) => expression.parse(),

    AtomicExpression: (expression) => expression.parse(),

    ParenthesizedExpression: (
        leftParenthesis,
        leftLineBreak,
        expression,
        rightLineBreak,
        rightParenthesis,
    ) => expression.parse(),

    PlaceholderExpression: (underscore) => new PlaceholderExpressionNode(span(underscore)),

    VariableExpression: (variableName) =>
        new VariableExpressionNode(variableName.parse(), span(variableName)),

    ConstructorExpression: (constructorName) =>
        new ConstructorExpressionNode(constructorName.parse(), span(constructorName)),

    NumberExpression: (number) => new NumberExpressionNode(number.sourceString, span(number)),

    StringExpression: (string) => new StringExpressionNode(parseString(string), span(string)),

    StructureExpression: (
        typeName,
        leftBrace,
        leftLineBreak,
        firstField,
        fieldLineBreak,
        restFields,
        rightLineBreak,
        rightBrace,
    ) =>
        new StructureExpressionNode(
            typeName.parse(),
            parseFirstRest(firstField, restFields),
            span(leftBrace, rightBrace),
        ),

    StructureExpressionField: (variableName, assignOperator, expression) =>
        new StructureExpressionField(
            variableName.parse(),
            expression.parse(),
            span(variableName, expression),
        ),

    BlockExpression: (leftBrace, leftLineBreak, statements, rightLineBreak, rightBrace) =>
        new BlockExpressionNode(statements.parse(), span(leftBrace, rightBrace)),

    UnitExpression: (leftParenthesis, lineBreak, rightParenthesis) =>
        new UnitExpressionNode(span(leftParenthesis, rightParenthesis)),

    FormatExpression: (string, expressions) =>
        new FormatExpressionNode(
            parseString(string),
            parseList(expressions),
            span(string, expressions),
        ),

    CallExpression: (func, inputs) =>
        new CallExpressionNode(func.parse(), parseList(inputs), span(func, inputs)),

    DoExpression: (doKeyword, expression) =>
        new DoExpressionNode(expression.parse(), span(doKeyword, expression)),

    WhenExpression: (
        whenKeyword,
        expression,
        leftBrace,
        leftLineBreak,
        firstArm,
        armLineBreak,
        restArms,
        rightLineBreak,
        rightBrace,
    ) =>
        new WhenExpressionNode(
            expression.parse(),
            parseOptionalFirstRest(firstArm, restArms),
            span(whenKeyword, rightBrace),
        ),

    Arm: (pattern, functionOperator, expression) =>
        new Arm(pattern.parse(), expression.parse(), span(pattern, expression)),

    IntrinsicExpression: (intrinsicKeyword, string, expressions) =>
        new IntrinsicExpressionNode(
            parseString(string),
            parseList(expressions),
            span(intrinsicKeyword, expressions),
        ),

    ToExpression: operator("left", span),

    ByExpression: operator("left", span),

    PowerExpression: operator("right", span),

    MultiplyExpression: operator("left", span),

    AddExpression: operator("left", span),

    CompareExpression: operator("left", span),

    EqualExpression: operator("left", span),

    AndExpression: operator("left", span),

    OrExpression: operator("left", span),

    ApplyExpression: operator("left", span),

    TupleExpression: (
        first,
        tupleOperator,
        leftLineBreak,
        rest,
        rightLineBreak,
        trailingOperator,
    ) => new TupleExpressionNode(parseOptionalFirstRest(first, rest), span(first, rest)),

    EmptyCollectionExpression: (collectionOperator) =>
        new CollectionExpressionNode([], span(collectionOperator)),

    CollectionExpression: (head, leftLineBreak, collectionOperator, rightLineBreak, last) =>
        new CollectionExpressionNode(
            [
                ...parseList(head),
                ...(last.numChildren > 0 ? [(last.children[0] as NonterminalNode).parse()] : []),
            ],
            span(head, last),
        ),

    IsExpression: (expression, isOperator, pattern) =>
        new IsExpressionNode(expression.parse(), pattern.parse(), span(expression, pattern)),

    AsExpression: (expression, asOperator, type) =>
        new AsExpressionNode(expression.parse(), type.parse(), span(expression, type)),

    AnnotateExpression: (expression, annotateOperator, type) =>
        new AnnotateExpressionNode(expression.parse(), type.parse(), span(expression, type)),

    FunctionExpression: (inputs, expression) =>
        new FunctionExpressionNode(inputs.parse(), expression.parse(), span(inputs, expression)),

    FunctionExpressionInputs: (patterns, functionOperator, lineBreak) => parseList(patterns),

    // Patterns

    Pattern: (pattern) => pattern.parse(),

    PatternElement: (pattern) => pattern.parse(),

    AtomicPattern: (pattern) => pattern.parse(),

    ParenthesizedPattern: (
        leftParenthesis,
        leftLineBreak,
        pattern,
        rightLineBreak,
        rightParenthesis,
    ) => pattern.parse(),

    WildcardPattern: (underscoreKeyword) => new WildcardPatternNode(span(underscoreKeyword)),

    VariablePattern: (variableName) =>
        new VariablePatternNode(variableName.parse(), span(variableName)),

    NumberPattern: (number) => new NumberPatternNode(number.sourceString, span(number)),

    StringPattern: (string) => new StringPatternNode(parseString(string), span(string)),

    StructurePattern: (
        typeName,
        leftBrace,
        leftLineBreak,
        firstField,
        fieldLineBreak,
        restFields,
        rightLineBreak,
        rightBrace,
    ) =>
        new StructurePatternNode(
            typeName.parse(),
            parseFirstRest(firstField, restFields),
            span(leftBrace, rightBrace),
        ),

    StructurePatternField: (variableName, assignOperator, pattern) =>
        new StructurePatternField(
            variableName.parse(),
            pattern.parse(),
            span(variableName, pattern),
        ),

    UnitPattern: (leftParenthesis, lineBreak, rightParenthesis) =>
        new UnitPatternNode(span(leftParenthesis, rightParenthesis)),

    TuplePattern: (first, tupleOperator, leftLineBreak, rest, rightLineBreak, trailingOperator) =>
        new TuplePatternNode(parseOptionalFirstRest(first, rest), span(first, rest)),

    OrPattern: (first, orOperator, leftLineBreak, rest, rightLineBreak) =>
        new OrPatternNode(parseOptionalFirstRest(first, rest), span(first, rest)),

    SetPattern: (setKeyword, variableName) =>
        new SetPatternNode(variableName.parse(), span(setKeyword, variableName)),

    ConstructorPattern: (constructorName, patterns) =>
        new ConstructorPatternNode(
            constructorName.parse(),
            parseList(patterns),
            span(constructorName, patterns),
        ),

    AnnotatePattern: (pattern, annotateOperator, type) =>
        new AnnotatePatternNode(pattern.parse(), type.parse(), span(pattern, type)),

    // Types

    Type: (type) => type.parse(),

    TypeElement: (type) => type.parse(),

    AtomicType: (type) => type.parse(),

    ParenthesizedType: (leftParenthesis, leftLineBreak, type, rightLineBreak, rightParenthesis) =>
        type.parse(),

    PlaceholderType: (underscoreKeyword) => new PlaceholderTypeNode(span(underscoreKeyword)),

    ParameterType: (typeParameterName) =>
        new TypeParameterNode(typeParameterName.parse(), false, undefined, span(typeParameterName)),

    AnnotatedParameterType: (typeParameterName, annotateOperator, type) =>
        new TypeParameterNode(
            typeParameterName.parse(),
            false,
            type.parse(),
            span(typeParameterName, type),
        ),

    NamedType: (typeName) => new NamedTypeNode(typeName.parse(), [], span(typeName)),

    FunctionType: (inputs, type) =>
        new FunctionTypeNode(inputs.parse(), type.parse(), span(inputs, type)),

    FunctionTypeInputs: (types, functionOperator, lineBreak) => parseList(types),

    BlockType: (leftBrace, leftLineBreak, type, rightLineBreak, rightBrace) =>
        new BlockTypeNode(type.parse(), span(leftBrace, rightBrace)),

    UnitType: (leftParenthesis, lineBreak, rightParenthesis) =>
        new UnitTypeNode(span(leftParenthesis, rightParenthesis)),

    TupleType: (first, tupleOperator, leftLineBreak, rest, rightLineBreak, trailingOperator) =>
        new TupleTypeNode(parseOptionalFirstRest(first, rest), span(first, rest)),

    ParameterizedType: (typeName, types) =>
        new NamedTypeNode(typeName.parse(), parseList(types), span(typeName, types)),

    // Constraints

    TypeParameters: (typeParameters, typeFunctionOperator) => parseList(typeParameters),

    TypeParameter: (parameter) => parameter.parse(),

    NamedTypeParameter: (typeParameterName) =>
        new TypeParameterNode(typeParameterName.parse(), false, undefined, span(typeParameterName)),

    InferTypeParameter: (
        leftParenthesis,
        leftLineBreak,
        inferKeyword,
        typeParameterName,
        rightLineBreak,
        rightParenthesis,
    ) =>
        new TypeParameterNode(
            typeParameterName.parse(),
            true,
            undefined,
            span(leftParenthesis, rightParenthesis),
        ),

    Constraints: (whereKeyword, constraints) => parseList(constraints),

    Constraint: (constraint) => constraint.parse(),

    BoundConstraint: (
        leftParenthesis,
        leftLineBreak,
        typeName,
        types,
        rightLineBreak,
        rightParenthesis,
    ) =>
        new BoundConstraintNode(
            typeName.parse(),
            parseList(types),
            span(leftParenthesis, rightParenthesis),
        ),

    DefaultConstraint: (
        leftParenthesis,
        leftLineBreak,
        typeName,
        annotateOperator,
        type,
        rightLineBreak,
        rightParenthesis,
    ) =>
        new DefaultConstraintNode(
            typeName.parse(),
            type.parse(),
            span(leftParenthesis, rightParenthesis),
        ),

    // Statements

    Statements: (first, lineBreak, rest, trailingComments) => parseOptionalFirstRest(first, rest),

    Statement: (statement) => statement.parse(),

    TypeDefinitionStatement: (
        comments,
        attributes,
        typeName,
        assignOperator,
        typeParameters,
        typeRepresentation,
    ) =>
        new TypeDefinitionNode(
            comments.parse(),
            attributes.parse(),
            typeName.parse(),
            parseOptional(typeParameters) ?? [],
            typeRepresentation.parse(),
            span(comments, typeRepresentation),
        ),

    TypeRepresentation: (representation) => representation.parse(),

    MarkerTypeRepresentation: (typeKeyword) => new MarkerTypeRepresentation(span(typeKeyword)),

    StructureTypeRepresentation: (
        typeKeyword,
        leftBrace,
        leftLineBreak,
        firstField,
        fieldLineBreak,
        restFields,
        rightLineBreak,
        rightBrace,
    ) =>
        new StructureTypeRepresentation(
            parseFirstRest(firstField, restFields),
            span(typeKeyword, rightBrace),
        ),

    FieldDefinition: (variableName, annotateOperator, type) =>
        new FieldDefinition(variableName.parse(), type.parse(), span(variableName, type)),

    EnumerationTypeRepresentation: (
        typeKeyword,
        leftBrace,
        leftLineBreak,
        firstVariant,
        variantLineBreak,
        restVariants,
        rightLineBreak,
        rightBrace,
    ) =>
        new EnumerationTypeRepresentation(
            parseFirstRest(firstVariant, restVariants),
            span(typeKeyword, rightBrace),
        ),

    VariantDefinition: (constructorName, types) =>
        new VariantDefinition(
            constructorName.parse(),
            parseList(types),
            span(constructorName, types),
        ),

    TraitDefinitionStatement: (
        comments,
        attributes,
        typeName,
        assignOperator,
        typeParameters,
        traitConstraints,
    ) => {
        const { type, constraints } = traitConstraints.parse();

        return new TraitDefinitionNode(
            comments.parse(),
            attributes.parse(),
            typeName.parse(),
            parseOptional(typeParameters) ?? [],
            type,
            constraints,
            span(comments, traitConstraints),
        );
    },

    TraitConstraints: (traitKeyword, type, constraints) => ({
        type: type.parse(),
        constraints: parseOptional(constraints) ?? [],
    }),

    ConstantDefinitionStatement: (comments, attributes, variableName, constantConstraints) => {
        const { type, constraints } = constantConstraints.parse();

        return new ConstantDefinitionNode(
            comments.parse(),
            attributes.parse(),
            variableName.parse(),
            type,
            constraints,
            span(comments, constantConstraints),
        );
    },

    ConstantConstraints: (annotateOperator, type, constraints) => ({
        type: type.parse(),
        constraints: parseOptional(constraints) ?? [],
    }),

    InstanceDefinitionStatement: (
        comments,
        attributes,
        instanceConstraints,
        assignOperator,
        value,
    ) => {
        const { bound, constraints } = instanceConstraints.parse();

        return new InstanceDefinitionNode(
            comments.parse(),
            attributes.parse(),
            bound,
            constraints,
            parseOptional(value),
            span(comments, value.children[0] ?? instanceConstraints),
        );
    },

    InstanceConstraints: (instanceKeyword, bound, constraints) => ({
        bound: bound.parse(),
        constraints: parseOptional(constraints) ?? [],
    }),

    AssignmentStatement: (comments, pattern, assignOperator, expression) =>
        new AssignmentNode(
            comments.parse(),
            [],
            pattern.parse(),
            expression.parse(),
            span(comments, expression),
        ),

    ExpressionStatement: (comments, expression) =>
        new ExpressionStatementNode(
            comments.parse(),
            [],
            expression.parse(),
            span(comments, expression),
        ),

    Comments: (comments, lineBreak) => comments.children.map((comment) => comment.sourceString),

    // Atoms

    TypeName: (value) => value.sourceString,

    ConstructorName: (value) => value.sourceString,

    VariableName: (value) => value.sourceString,

    TypeParameterName: (value) => value.sourceString,

    AttributeName: (value) => value.sourceString,
});

/* eslint-disable @typescript-eslint/no-unsafe-member-access */

const operator =
    (associativity: "left" | "right", span: SpanFn) =>
    (
        first: NonterminalNode,
        leftLineBreak: any,
        operator: IterationNode,
        rightLineBreak: any,
        rest: IterationNode,
    ) => {
        if (rest.children.length === 0) {
            return first.parse();
        }

        switch (associativity) {
            case "left": {
                return rest.children.reduce<any>(
                    ({ node: left, span: leftSpan }, right) => ({
                        node: new OperatorExpressionNode(
                            operator.children[0].sourceString,
                            left,
                            (right as NonterminalNode).parse(),
                            span(leftSpan, right),
                        ),
                        span: right,
                    }),
                    { node: first.parse(), span: first },
                ).node;
            }
            case "right": {
                return rest.children.reduceRight<any>(
                    ({ node: right, span: rightSpan }, left) => ({
                        node: new OperatorExpressionNode(
                            operator.sourceString,
                            (left as NonterminalNode).parse(),
                            right,
                            span(left, rightSpan),
                        ),
                        span: left,
                    }),
                    { node: first.parse(), span: first },
                ).node;
            }
        }
    };

export default parser;
