import { LocationRange } from "peggy";
import { Token } from "./tokens";

export type Type =
    | PlaceholderType
    | UnitType
    | NamedType
    | BlockType
    | FunctionType
    | ParameterType
    | TupleType;

export interface PlaceholderType {
    type: "placeholder";
    location: LocationRange;
}

export interface ParameterType {
    type: "parameter";
    location: LocationRange;
    name: Token;
    value?: Type;
}

export interface NamedType {
    type: "named";
    location: LocationRange;
    name: Token;
    parameters: Type[];
}

export interface FunctionType {
    type: "function";
    location: LocationRange;
    inputs: Type[];
    output: Type;
}

export interface BlockType {
    type: "block";
    location: LocationRange;
    output: Type;
}

export interface UnitType {
    type: "unit";
    location: LocationRange;
}

export interface TupleType {
    type: "tuple";
    location: LocationRange;
    elements: Type[];
}
