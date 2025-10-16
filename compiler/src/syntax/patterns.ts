import { LocationRange } from "peggy";
import { Token } from "./tokens";
import { Type } from "./types";

export type Pattern =
    | UnitPattern
    | WildcardPattern
    | VariablePattern
    | NumberPattern
    | StringPattern
    | StructurePattern
    | SetPattern
    | ConstructorPattern
    | OrPattern
    | TuplePattern
    | AnnotatePattern;

export interface WildcardPattern {
    type: "wildcard";
    location: LocationRange;
}

export interface VariablePattern {
    type: "variable";
    location: LocationRange;
    variable: Token;
}

export interface NumberPattern {
    type: "number";
    location: LocationRange;
    value: Token;
}

export interface StringPattern {
    type: "string";
    location: LocationRange;
    value: Token;
}

export interface StructurePattern {
    type: "structure";
    location: LocationRange;
    name: Token;
    fields: StructurePatternField[];
}

export interface StructurePatternField {
    location: LocationRange;
    name: Token;
    value: Pattern;
}

export interface UnitPattern {
    type: "unit";
    location: LocationRange;
}

export interface TuplePattern {
    type: "tuple";
    location: LocationRange;
    elements: Pattern[];
}

export interface OrPattern {
    type: "or";
    location: LocationRange;
    patterns: Pattern[];
}

export interface SetPattern {
    type: "set";
    location: LocationRange;
    variable: Token;
}

export interface ConstructorPattern {
    type: "constructor";
    location: LocationRange;
    constructor: Token;
    elements: Pattern[];
}

export interface AnnotatePattern {
    type: "annotate";
    location: LocationRange;
    left: Pattern;
    right: Type;
}
