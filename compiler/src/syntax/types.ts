import type { Parser } from "./parser";
import { parseTypeName, parseTypeParameterName } from "./atoms";
import { BlockTypeNode } from "../nodes/types/block";
import { FunctionTypeNode } from "../nodes/types/function";
import { NamedTypeNode } from "../nodes/types/named";
import { TypeParameterNode } from "../nodes/types/parameter";
import { PlaceholderTypeNode } from "../nodes/types/placeholder";
import { TupleTypeNode } from "../nodes/types/tuple";
import { UnitTypeNode } from "../nodes/types/unit";
import type { TypeNode } from "../nodes/types";

export const parseType = (parser: Parser): TypeNode =>
    parser.alternatives<TypeNode>("type", parseType, [
        parseTupleType,
        parseFunctionType,
        parseAnnotatedParameterType,
        parseTypeElement,
    ]);

export const parseTypeElement = (parser: Parser): TypeNode =>
    parser.alternatives<TypeNode>("type", parseTypeElement, [
        parseParameterizedType,
        parseAtomicType,
    ]);

export const parseAtomicType = (parser: Parser): TypeNode =>
    parser.alternatives<TypeNode>("type", parseAtomicType, [
        parsePlaceholderType,
        parseParameterType,
        parseNamedType,
        parseBlockType,
        parseUnitType,
        parseParenthesizedType,
    ]);

export const parseParenthesizedType = (parser: Parser) =>
    parser.delimited("leftParenthesis", "rightParenthesis", () => parseType(parser));

export const parsePlaceholderType = (parser: Parser) =>
    parser.spanned((span) => {
        parser.next("underscoreKeyword");
        return new PlaceholderTypeNode(span());
    });

export const parseParameterType = (parser: Parser) =>
    parser.spanned(
        (span) => new TypeParameterNode(parseTypeParameterName(parser), false, undefined, span()),
    );

export const parseAnnotatedParameterType = (parser: Parser) =>
    parser.spanned((span) => {
        const name = parseTypeParameterName(parser);
        parser.next("annotateOperator");
        const value = parseType(parser);
        return new TypeParameterNode(name, false, value, span());
    });

export const parseNamedType = (parser: Parser) =>
    parser.spanned((span) => new NamedTypeNode(parseTypeName(parser), [], span()));

export const parseFunctionType = (parser: Parser) =>
    parser.spanned((span) => {
        const inputs = parseFunctionTypeInputs(parser);
        const output = parseType(parser);
        return new FunctionTypeNode(inputs, output, span());
    });

export const parseFunctionTypeInputs = (parser: Parser) => {
    const inputs = parser.many("type", parseAtomicType);
    parser.next("functionOperator");
    parser.commit();
    return inputs;
};

export const parseBlockType = (parser: Parser) =>
    parser.spanned((span) => {
        const output = parser.delimited("leftBrace", "rightBrace", () => parseTypeElement(parser));
        return new BlockTypeNode(output, span());
    });

export const parseUnitType = (parser: Parser) =>
    parser.spanned((span) => {
        parser.delimited("leftParenthesis", "rightParenthesis", () => undefined);
        return new UnitTypeNode(span());
    });

export const parseTupleType = (parser: Parser) =>
    parser.spanned((span) => {
        const elements = parser
            .collection("tuple type", ["tupleOperator"], parseTypeElement)
            .map(([element]) => element);
        return new TupleTypeNode(elements, span());
    });

export const parseParameterizedType = (parser: Parser) =>
    parser.spanned((span) => {
        const name = parseTypeName(parser);
        const parameters = parser.many("type", parseAtomicType);
        return new NamedTypeNode(name, parameters, span());
    });
