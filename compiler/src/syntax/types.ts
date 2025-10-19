import { Parser, LocationRange, Token } from "./parser";
import { parseTypeName, parseTypeParameterName } from "./tokens";

export type Type =
    | PlaceholderType
    | UnitType
    | NamedType
    | BlockType
    | FunctionType
    | ParameterType
    | TupleType;

export const parseType = (parser: Parser): Type =>
    parser.alternatives<Type>("type", [
        parseTupleType,
        parseFunctionType,
        parseAnnotatedParameterType,
        parseTypeElement,
    ]);

export const parseTypeElement = (parser: Parser): Type =>
    parser.alternatives<Type>("type", [parseParameterizedType, parseAtomicType]);

export const parseAtomicType = (parser: Parser): Type =>
    parser.alternatives<Type>("type", [
        parsePlaceholderType,
        parseParameterType,
        parseNamedType,
        parseBlockType,
        parseUnitType,
        parseParenthesizedType,
    ]);

export const parseParenthesizedType = (parser: Parser): Type =>
    parser.withLocation(() =>
        parser.delimited("leftParenthesis", "rightParenthesis", () => parseType(parser)),
    );

export interface PlaceholderType {
    type: "placeholder";
    location: LocationRange;
}

export const parsePlaceholderType = (parser: Parser): PlaceholderType =>
    parser.withLocation(() => {
        parser.next("underscoreKeyword");
        return { type: "placeholder" };
    });

export interface ParameterType {
    type: "parameter";
    location: LocationRange;
    name: Token;
    value?: Type;
}

export const parseParameterType = (parser: Parser): ParameterType =>
    parser.withLocation(() => ({
        type: "parameter",
        name: parseTypeParameterName(parser),
    }));

export const parseAnnotatedParameterType = (parser: Parser): ParameterType =>
    parser.withLocation(() => {
        const name = parseTypeParameterName(parser);
        parser.next("annotateOperator");
        const value = parseType(parser);
        return { type: "parameter", name, value };
    });

export interface NamedType {
    type: "named";
    location: LocationRange;
    name: Token;
    parameters: Type[];
}

export const parseNamedType = (parser: Parser): NamedType =>
    parser.withLocation(() => ({
        type: "named",
        name: parseTypeName(parser),
        parameters: [],
    }));

export interface FunctionType {
    type: "function";
    location: LocationRange;
    inputs: Type[];
    output: Type;
}

export const parseFunctionType = (parser: Parser): FunctionType =>
    parser.withLocation(() => {
        const inputs = parseFunctionTypeInputs(parser);
        const output = parseType(parser);
        return { type: "function", inputs, output };
    });

export const parseFunctionTypeInputs = (parser: Parser): Type[] =>
    parser.allowingLineBreaks(false, () => {
        const inputs = parser.many("type", parseAtomicType);
        parser.next("functionOperator");
        parser.commit();
        return inputs;
    });

export interface BlockType {
    type: "block";
    location: LocationRange;
    output: Type;
}

export const parseBlockType = (parser: Parser): BlockType =>
    parser.withLocation(() =>
        parser.delimited("leftBrace", "rightBrace", () => ({
            type: "block",
            output: parseTypeElement(parser),
        })),
    );

export interface UnitType {
    type: "unit";
    location: LocationRange;
}

export const parseUnitType = (parser: Parser): UnitType =>
    parser.withLocation(() =>
        parser.delimited("leftParenthesis", "rightParenthesis", () => ({
            type: "unit",
        })),
    );

export interface TupleType {
    type: "tuple";
    location: LocationRange;
    elements: Type[];
}

export const parseTupleType = (parser: Parser): TupleType =>
    parser.withLocation(() => ({
        type: "tuple",
        elements: parser
            .collection("tuple type", ["tupleOperator"], parseTypeElement)
            .map(([element]) => element),
    }));

export const parseParameterizedType = (parser: Parser): NamedType =>
    parser.withLocation(() =>
        parser.allowingLineBreaks(false, () => ({
            type: "named",
            name: parseTypeName(parser),
            parameters: parser.many("type", parseAtomicType),
        })),
    );
