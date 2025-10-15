import { LocationRange } from "peggy";
import { Pattern } from "./patterns";
import { Token } from "./tokens";
import { Type } from "./types";
import { Statement } from "./statements";

export type Expression =
    | FunctionExpression
    | TupleExpression
    | CollectionExpression
    | IsExpression
    | AsExpression
    | AnnotateExpression
    | BinaryExpression
    | FormatExpression
    | CallExpression
    | DoExpression
    | WhenExpression
    | IntrinsicExpression
    | PlaceholderExpression
    | VariableExpression
    | ConstructorExpression
    | NumberExpression
    | StringExpression
    | StructureExpression
    | BlockExpression
    | UnitExpression;

export interface PlaceholderExpression {
    type: "placeholder";
    location: LocationRange;
}

export interface VariableExpression {
    type: "variable";
    location: LocationRange;
    variable: Token;
}

export interface ConstructorExpression {
    type: "constructor";
    location: LocationRange;
    trait: Token;
}

export interface NumberExpression {
    type: "number";
    location: LocationRange;
    value: Token;
}

export interface StringExpression {
    type: "string";
    location: LocationRange;
    value: Token;
}

export interface StructureExpression {
    type: "structure";
    location: LocationRange;
    name: Token;
    fields: StructureExpressionField[];
}

export interface StructureExpressionField {
    location: LocationRange;
    name: Token;
    value: Expression;
}

export interface BlockExpression {
    type: "block";
    location: LocationRange;
    statements: Statement[];
}

export interface UnitExpression {
    type: "unit";
    location: LocationRange;
}

export interface FormatExpression {
    type: "format";
    location: LocationRange;
    string: Token;
    inputs: Expression[];
}

export interface CallExpression {
    type: "call";
    location: LocationRange;
    function: Expression;
    inputs: Expression[];
}

export interface DoExpression {
    type: "do";
    location: LocationRange;
    input: Expression;
}

export interface WhenExpression {
    type: "when";
    location: LocationRange;
    input: Expression;
    arms: Arm[];
}

export interface Arm {
    location: LocationRange;
    pattern: Pattern;
    value: Expression;
}

export interface IntrinsicExpression {
    type: "intrinsic";
    location: LocationRange;
    name: Token;
    inputs: Expression[];
}

export type BinaryExpression =
    | BinaryExpressionInner<"to">
    | BinaryExpressionInner<"by">
    | BinaryExpressionInner<"^">
    | BinaryExpressionInner<"*">
    | BinaryExpressionInner<"/">
    | BinaryExpressionInner<"%">
    | BinaryExpressionInner<"+">
    | BinaryExpressionInner<"-">
    | BinaryExpressionInner<"<">
    | BinaryExpressionInner<"<=">
    | BinaryExpressionInner<">">
    | BinaryExpressionInner<">=">
    | BinaryExpressionInner<"=">
    | BinaryExpressionInner<"/=">
    | BinaryExpressionInner<"and">
    | BinaryExpressionInner<"or">
    | BinaryExpressionInner<".">;

export interface BinaryExpressionInner<O extends string> {
    type: "binary";
    operator: O;
    location: LocationRange;
    left: Expression;
    right: Expression;
}

export interface TupleExpression {
    type: "tuple";
    location: LocationRange;
    elements: Expression[];
}

export interface CollectionExpression {
    type: "collection";
    location: LocationRange;
    elements: Expression[];
}

export interface IsExpression {
    type: "is";
    location: LocationRange;
    left: Expression;
    right: Pattern;
}

export interface AsExpression {
    type: "as";
    location: LocationRange;
    left: Expression;
    right: Type;
}

export interface AnnotateExpression {
    type: "annotate";
    location: LocationRange;
    left: Expression;
    right: Type;
}

export interface FunctionExpression {
    type: "function";
    location: LocationRange;
    inputs: Pattern[];
    output: Expression;
}
