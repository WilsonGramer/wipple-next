import { LocationRange } from "peggy";
import { Token } from "./tokens";
import { Type } from "./types";

export type Pattern =
    | UnitPattern
    | WildcardPattern
    | VariablePattern
    | NumberPattern
    | TextPattern
    | DestructurePattern
    | SetPattern
    | VariantPattern
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

export interface TextPattern {
    type: "text";
    location: LocationRange;
    value: Token;
}

export interface DestructurePattern {
    type: "destructure";
    location: LocationRange;
    fields: DestructurePatternField[];
}

export interface DestructurePatternField {
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

export interface VariantPattern {
    type: "variant";
    location: LocationRange;
    variant: Token;
    elements: Pattern[];
}

export interface AnnotatePattern {
    type: "annotate";
    location: LocationRange;
    left: Pattern;
    right: Type;
}
