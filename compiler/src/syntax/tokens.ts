import { Parser, Token } from "./parser";

export const parseString = (parser: Parser): Token => parser.next("string");

export const parseNumber = (parser: Parser): Token => parser.next("number");

export const parseTypeName = (parser: Parser): Token => parser.next("capitalName");

export const parseConstructorName = (parser: Parser): Token => parser.next("capitalName");

export const parseVariableName = (parser: Parser): Token => parser.next("lowercaseName");

export const parseTypeParameterName = (parser: Parser): Token => parser.next("lowercaseName");

export const parseAttributeName = (parser: Parser): Token =>
    parser.alternatives("attribute name", [
        () => parser.next("lowercaseName"),
        () => parser.next("intrinsicKeyword"),
    ]);

export const parseLineBreak = (parser: Parser): Token => parser.next("lineBreak");

export const parseComment = (parser: Parser): Token => parser.next("comment");
