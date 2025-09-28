import { LocationRange } from "peggy";
import { Token } from "./tokens";

export interface Attributes {
    location: LocationRange;
    attributes: Attribute[];
}

export interface Attribute {
    location: LocationRange;
    name: Token;
    value?: AttributeValue;
}

export type AttributeValue = StringAttributeValue;

export interface StringAttributeValue {
    type: "string";
    location: LocationRange;
    value: Token;
}
