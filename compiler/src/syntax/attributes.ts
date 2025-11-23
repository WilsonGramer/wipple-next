import type { Parser } from "./parser";
import { parseAttributeName, parseString } from "./atoms";
import { AttributeNode } from "../nodes/attributes";
import { StringAttributeValue } from "../nodes/attributes/value";

export const parseAttributes = (parser: Parser) =>
    parser.optional(() => parser.many("attribute", parseAttribute, ["lineBreak"]), []);

export const parseAttribute = (parser: Parser) =>
    parser.spanned((span) =>
        parser.delimited("leftBracket", "rightBracket", () => {
            const name = parseAttributeName(parser);
            const value = parser.try("assignOperator") ? parseAttributeValue(parser) : undefined;
            return new AttributeNode(name, value, span());
        }),
    );

export const parseAttributeValue = (parser: Parser) =>
    parser.spanned((span) => new StringAttributeValue(parseString(parser), span()));
