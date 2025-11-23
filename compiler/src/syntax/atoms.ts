import type { Parser } from "./parser";

export const parseString = (parser: Parser) => parser.next("string");

export const parseNumber = (parser: Parser) => parser.next("number");

export const parseTypeName = (parser: Parser) => parser.next("capitalName");

export const parseConstructorName = (parser: Parser) => parser.next("capitalName");

export const parseVariableName = (parser: Parser) => parser.next("lowercaseName");

export const parseTypeParameterName = (parser: Parser) => parser.next("lowercaseName");

export const parseAttributeName = (parser: Parser) =>
    parser.alternatives("attribute name", parseAttributeName, [
        () => parser.next("lowercaseName"),
        () => parser.next("intrinsicKeyword"),
    ]);

export const parseLineBreak = (parser: Parser) => parser.next("lineBreak");

export const parseComment = (parser: Parser) => parser.next("comment");
