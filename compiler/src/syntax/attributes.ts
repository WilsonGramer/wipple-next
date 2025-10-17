import { Parser, LocationRange, Token } from "./parser";
import { parseAttributeName, parseString } from "./tokens";

export const parseAttributes = (parser: Parser): Attribute[] =>
    parser.optional("attributes", () => parser.many("attribute", parseAttribute), []);

export interface Attribute {
    location: LocationRange;
    name: Token;
    value?: AttributeValue;
}

export const parseAttribute = (parser: Parser): Attribute =>
    parser.withLocation(() =>
        parser.delimited("leftBracket", "rightBracket", () => ({
            name: parseAttributeName(parser),
            value: parser.try("assignOperator") ? parseAttributeValue(parser) : undefined,
        }))
    );

export type AttributeValue = StringAttributeValue;

export const parseAttributeValue = (parser: Parser): AttributeValue =>
    parser.alternatives("attribute value", [parseStringAttribute]);

export interface StringAttributeValue {
    type: "string";
    location: LocationRange;
    value: Token;
}

const parseStringAttribute = (parser: Parser): StringAttributeValue =>
    parser.withLocation(() => ({
        type: "string",
        value: parseString(parser),
    }));
