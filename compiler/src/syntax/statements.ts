import { Parser, LocationRange, Token } from "./parser";
import { Attribute, parseAttributes } from "./attributes";
import {
    Constraint,
    BoundConstraint,
    parseConstraints,
    parseBoundConstraint,
    parseTypeParameters,
    TypeParameter,
} from "./constraints";
import { Expression, parseExpression } from "./expressions";
import { Pattern, parsePattern } from "./patterns";
import { Type, parseType, parseAtomicType } from "./types";
import { parseComment, parseConstructorName, parseTypeName, parseVariableName } from "./tokens";

export type Statement =
    | ConstantDefinitionStatement
    | TypeDefinitionStatement
    | TraitDefinitionStatement
    | InstanceDefinitionStatement
    | AssignmentStatement
    | ExpressionStatement
    | EmptyStatement;

export const parseStatements = (parser: Parser): Statement[] =>
    parser.allowingLineBreaks(false, () =>
        parser.optional(
            "statements",
            () => parser.many("statement", parseStatement, "lineBreak"),
            [],
        ),
    );

export const parseStatement = (parser: Parser): Statement =>
    parser.alternatives<Statement>("statement", [
        parseTypeDefinitionStatement,
        parseTraitDefinitionStatement,
        parseConstantDefinitionStatement,
        parseInstanceDefinitionStatement,
        parseAssignmentStatement,
        parseExpressionStatement,
    ]);

export interface TypeDefinitionStatement {
    type: "typeDefinition";
    location: LocationRange;
    comments: Token[];
    attributes: Attribute[];
    name: Token;
    parameters: TypeParameter[];
    representation: TypeRepresentation;
}

export const parseTypeDefinitionStatement = (parser: Parser): TypeDefinitionStatement =>
    parser.withLocation(() => {
        const comments = parseComments(parser);
        const attributes = parseAttributes(parser);
        const name = parseTypeName(parser);
        parser.next("assignOperator");
        const parameters = parser.optional("type parameters", parseTypeParameters, []);
        const representation = parseTypeRepresentation(parser);
        return { type: "typeDefinition", comments, attributes, name, parameters, representation };
    });

export type TypeRepresentation =
    | StructureTypeRepresentation
    | EnumerationTypeRepresentation
    | MarkerTypeRepresentation;

export const parseTypeRepresentation = (parser: Parser): TypeRepresentation =>
    parser.alternatives<TypeRepresentation>("typeRepresentation", [
        parseStructureTypeRepresentation,
        parseEnumerationTypeRepresentation,
        parseMarkerTypeRepresentation,
    ]);

export interface MarkerTypeRepresentation {
    type: "marker";
    location: LocationRange;
}

export const parseMarkerTypeRepresentation = (parser: Parser): MarkerTypeRepresentation =>
    parser.withLocation(() => {
        parser.next("typeKeyword");
        return { type: "marker" };
    });

export interface StructureTypeRepresentation {
    type: "structure";
    location: LocationRange;
    fields: FieldDefinition[];
}

export const parseStructureTypeRepresentation = (parser: Parser): StructureTypeRepresentation =>
    parser.withLocation(() => {
        parser.next("typeKeyword");
        return {
            type: "structure",
            fields: parser.delimited("leftBrace", "rightBrace", () =>
                parser.allowingLineBreaks(false, () =>
                    parser.many("field definition", parseFieldDefinition, "lineBreak"),
                ),
            ),
        };
    });

export interface FieldDefinition {
    location: LocationRange;
    name: Token;
    type: Type;
}

export const parseFieldDefinition = (parser: Parser): FieldDefinition =>
    parser.withLocation(() => {
        const name = parseVariableName(parser);
        parser.next("annotateOperator");
        parser.commit();
        const type = parseType(parser);
        return { name, type };
    });

export interface EnumerationTypeRepresentation {
    type: "enumeration";
    location: LocationRange;
    variants: VariantDefinition[];
}

export const parseEnumerationTypeRepresentation = (parser: Parser): EnumerationTypeRepresentation =>
    parser.withLocation(() => {
        parser.next("typeKeyword");
        return {
            type: "enumeration",
            variants: parser.delimited("leftBrace", "rightBrace", () =>
                parser.allowingLineBreaks(false, () =>
                    parser.many("variant definition", parseVariantDefinition, "lineBreak"),
                ),
            ),
        };
    });

export interface VariantDefinition {
    location: LocationRange;
    name: Token;
    elements: Type[];
}

export const parseVariantDefinition = (parser: Parser): VariantDefinition =>
    parser.withLocation(() =>
        parser.allowingLineBreaks(false, () => {
            const name = parseConstructorName(parser);
            parser.commit();
            return {
                name,
                elements: parser.optional(
                    "elements",
                    () => parser.many("type", parseAtomicType),
                    [],
                ),
            };
        }),
    );

export interface TraitDefinitionStatement {
    type: "traitDefinition";
    location: LocationRange;
    comments: Token[];
    attributes: Attribute[];
    name: Token;
    parameters: TypeParameter[];
    constraints: TraitConstraints;
}

export const parseTraitDefinitionStatement = (parser: Parser): TraitDefinitionStatement =>
    parser.withLocation(() => {
        const comments = parseComments(parser);
        const attributes = parseAttributes(parser);
        const name = parseTypeName(parser);
        parser.next("assignOperator");
        const parameters = parser.optional("type parameters", parseTypeParameters, []);
        const constraints = parseTraitConstraints(parser);
        return { type: "traitDefinition", comments, attributes, name, parameters, constraints };
    });

export interface TraitConstraints {
    location: LocationRange;
    type: Type;
    constraints: Constraint[];
}

export const parseTraitConstraints = (parser: Parser): TraitConstraints =>
    parser.withLocation(() => {
        parser.next("traitKeyword");
        parser.commit();
        return {
            type: parseAtomicType(parser),
            constraints: parser.optional("constraints", parseConstraints, []),
        };
    });

export interface ConstantDefinitionStatement {
    type: "constantDefinition";
    location: LocationRange;
    comments: Token[];
    attributes: Attribute[];
    name: Token;
    constraints: ConstantConstraints;
}

export const parseConstantDefinitionStatement = (parser: Parser): ConstantDefinitionStatement =>
    parser.withLocation(() => {
        const comments = parseComments(parser);
        const attributes = parseAttributes(parser);
        const name = parseVariableName(parser);
        const constraints = parseConstantConstraints(parser);
        return { type: "constantDefinition", comments, attributes, name, constraints };
    });

export interface ConstantConstraints {
    location: LocationRange;
    type: Type;
    constraints: Constraint[];
}

export const parseConstantConstraints = (parser: Parser): ConstantConstraints =>
    parser.withLocation(() => {
        parser.next("annotateOperator");
        parser.commit();
        return {
            type: parseType(parser),
            constraints: parser.optional("constraints", parseConstraints, []),
        };
    });

export interface InstanceDefinitionStatement {
    type: "instanceDefinition";
    location: LocationRange;
    comments: Token[];
    attributes: Attribute[];
    constraints: InstanceConstraints;
    value?: Expression;
}

export const parseInstanceDefinitionStatement = (parser: Parser): InstanceDefinitionStatement =>
    parser.withLocation(() => {
        return {
            type: "instanceDefinition",
            comments: parseComments(parser),
            attributes: parseAttributes(parser),
            constraints: parseInstanceConstraints(parser),
            value: parser.optional(
                "value",
                () => {
                    parser.next("assignOperator");
                    parser.commit();
                    return parseExpression(parser);
                },
                undefined,
            ),
        };
    });

export interface InstanceConstraints {
    location: LocationRange;
    bound: BoundConstraint;
    constraints: Constraint[];
}

export const parseInstanceConstraints = (parser: Parser): InstanceConstraints =>
    parser.withLocation(() => {
        parser.next("instanceKeyword");
        return {
            bound: parseBoundConstraint(parser),
            constraints: parser.optional("constraints", parseConstraints, []),
        };
    });

export interface AssignmentStatement {
    type: "assignment";
    location: LocationRange;
    comments: Token[];
    pattern: Pattern;
    value: Expression;
}

export const parseAssignmentStatement = (parser: Parser): AssignmentStatement =>
    parser.withLocation(() => {
        const comments = parseComments(parser);
        const pattern = parsePattern(parser);
        parser.next("assignOperator");
        const value = parseExpression(parser);
        return { type: "assignment", comments, pattern, value };
    });

export interface ExpressionStatement {
    type: "expression";
    location: LocationRange;
    comments: Token[];
    expression: Expression;
}

export const parseExpressionStatement = (parser: Parser): ExpressionStatement =>
    parser.withLocation(() => ({
        type: "expression",
        comments: parseComments(parser),
        expression: parseExpression(parser),
    }));

export interface EmptyStatement {
    type: "empty";
    location: LocationRange;
    comments: Token[];
}

export const parseComments = (parser: Parser): Token[] =>
    parser.optional("comments", () => parser.many("comment", parseComment, "lineBreak"), []);
