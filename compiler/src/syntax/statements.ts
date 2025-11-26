import type { StatementNode } from "../nodes/statements";
import { AssignmentNode } from "../nodes/statements/assignment";
import { ConstantDefinitionNode } from "../nodes/statements/constant-definition";
import { EmptyStatementNode } from "../nodes/statements/empty";
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
import { parseComment, parseConstructorName, parseTypeName, parseVariableName } from "./atoms";
import { parseAttributes } from "./attributes";
import { parseBoundConstraint, parseConstraints, parseTypeParameters } from "./constraints";
import { parseExpression } from "./expressions";
import type { Parser } from "./parser";
import { parsePattern } from "./patterns";
import { parseAtomicType, parseType } from "./types";

export const parseStatements = (parser: Parser) => {
    const statements = parser.optional(
        () => parser.many("statement", parseStatement, ["lineBreak"]),
        [],
    );

    const trailing = parser.optional(parseEmptyStatement, undefined);
    if (trailing != null) {
        statements.push(trailing);
    }

    return statements;
};

export const parseStatement = (parser: Parser) =>
    parser.alternatives<StatementNode>("statement", parseStatement, [
        parseTypeDefinitionStatement,
        parseTraitDefinitionStatement,
        parseConstantDefinitionStatement,
        parseInstanceDefinitionStatement,
        parseAssignmentStatement,
        parseExpressionStatement,
    ]);

export const parseTypeDefinitionStatement = (parser: Parser) =>
    parser.spanned((span) => {
        const comments = parseComments(parser);
        const attributes = parseAttributes(parser);
        const name = parseTypeName(parser);
        parser.next("assignOperator");
        const parameters = parser.optional(parseTypeParameters, []);
        const representation = parseTypeRepresentation(parser);
        return new TypeDefinitionNode(
            comments,
            attributes,
            name,
            parameters,
            representation,
            span(),
        );
    });

export const parseTypeRepresentation = (
    parser: Parser,
): StructureTypeRepresentation | EnumerationTypeRepresentation | MarkerTypeRepresentation =>
    parser.alternatives("typeRepresentation", parseTypeRepresentation, [
        parseStructureTypeRepresentation,
        parseEnumerationTypeRepresentation,
        parseMarkerTypeRepresentation,
    ]);

export const parseMarkerTypeRepresentation = (parser: Parser) =>
    parser.spanned((span) => {
        parser.next("typeKeyword");
        return new MarkerTypeRepresentation(span());
    });

export const parseStructureTypeRepresentation = (parser: Parser) =>
    parser.spanned((span) => {
        parser.next("typeKeyword");
        const fields = parser.delimited("leftBrace", "rightBrace", () =>
            parser.many("field definition", parseFieldDefinition, ["lineBreak"]),
        );
        return new StructureTypeRepresentation(fields, span());
    });

export const parseFieldDefinition = (parser: Parser) =>
    parser.spanned((span) => {
        const name = parseVariableName(parser);
        parser.next("annotateOperator");
        parser.commit();
        const type = parseType(parser);
        return new FieldDefinition(name, type, span());
    });

export const parseEnumerationTypeRepresentation = (parser: Parser) =>
    parser.spanned((span) => {
        parser.next("typeKeyword");
        const variants = parser.delimited("leftBrace", "rightBrace", () =>
            parser.many("variant definition", parseVariantDefinition, ["lineBreak"]),
        );
        return new EnumerationTypeRepresentation(variants, span());
    });

export const parseVariantDefinition = (parser: Parser) =>
    parser.spanned((span) => {
        const name = parseConstructorName(parser);
        parser.commit();
        const elements = parser.optional(() => parser.many("type", parseAtomicType), []);
        return new VariantDefinition(name, elements, span());
    });

export const parseTraitDefinitionStatement = (parser: Parser) =>
    parser.spanned((span) => {
        const comments = parseComments(parser);
        const attributes = parseAttributes(parser);
        const name = parseTypeName(parser);
        parser.next("assignOperator");
        const parameters = parser.optional(parseTypeParameters, []);
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
    });

export const parseTraitConstraints = (parser: Parser) =>
    parser.spanned(() => {
        parser.next("traitKeyword");
        parser.commit();
        const type = parseAtomicType(parser);
        const constraints = parser.optional(parseConstraints, []);
        return { type, constraints };
    });

export const parseConstantDefinitionStatement = (parser: Parser) =>
    parser.spanned((span) => {
        const comments = parseComments(parser);
        const attributes = parseAttributes(parser);
        const name = parseVariableName(parser);
        const { type, constraints } = parseConstantConstraints(parser);
        return new ConstantDefinitionNode(comments, attributes, name, type, constraints, span());
    });

export const parseConstantConstraints = (parser: Parser) =>
    parser.spanned(() => {
        parser.next("annotateOperator");
        parser.commit();
        const type = parseType(parser);
        const constraints = parser.optional(parseConstraints, []);
        return { type, constraints };
    });

export const parseInstanceDefinitionStatement = (parser: Parser) =>
    parser.spanned((span) => {
        const comments = parseComments(parser);
        const attributes = parseAttributes(parser);
        const { bound, constraints } = parseInstanceConstraints(parser);
        const value = parser.optional(() => {
            parser.next("assignOperator");
            parser.commit();
            return parseExpression(parser);
        }, undefined);
        return new InstanceDefinitionNode(comments, attributes, bound, constraints, value, span());
    });

export const parseInstanceConstraints = (parser: Parser) =>
    parser.spanned(() => {
        parser.next("instanceKeyword");
        const bound = parseBoundConstraint(parser);
        const constraints = parser.optional(parseConstraints, []);
        return { bound, constraints };
    });

export const parseAssignmentStatement = (parser: Parser) =>
    parser.spanned((span) => {
        const comments = parseComments(parser);
        const pattern = parsePattern(parser);
        parser.next("assignOperator");
        parser.commit();
        const value = parseExpression(parser);
        return new AssignmentNode(comments, [], pattern, value, span());
    });

export const parseExpressionStatement = (parser: Parser) =>
    parser.spanned((span) => {
        const comments = parseComments(parser);
        const expression = parseExpression(parser);
        return new ExpressionStatementNode(comments, [], expression, span());
    });

export const parseEmptyStatement = (parser: Parser) =>
    parser.spanned((span) => {
        const comments = parseComments(parser);
        return new EmptyStatementNode(comments, span());
    });

export const parseComments = (parser: Parser) =>
    parser.optional(() => parser.many("comment", parseComment, ["lineBreak"]), []);
