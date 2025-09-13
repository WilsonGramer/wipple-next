import { LocationRange } from "peggy";
import { Token } from "./tokens";

export interface Attribute {
    location: LocationRange;
    name: Token;
    value?: AttributeValue;
}

export type AttributeValue = TextAttributeValue;

export interface TextAttributeValue {
    type: "text";
    location: LocationRange;
    value: Token;
}
