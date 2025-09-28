import { LocationRange } from "peggy";
import { Attributes } from "./attributes";
import { Constraint, BoundConstraint } from "./constraints";
import { Expression } from "./expressions";
import { Pattern } from "./patterns";
import { Token } from "./tokens";
import { Type } from "./types";

export type Statement =
    | ConstantDefinitionStatement
    | TypeDefinitionStatement
    | TraitDefinitionStatement
    | InstanceDefinitionStatement
    | AssignmentStatement
    | ExpressionStatement
    | EmptyStatement;

export interface TypeDefinitionStatement {
    type: "typeDefinition";
    location: LocationRange;
    comments: Comments;
    attributes: Attributes;
    name: Token;
    parameters: TypeParameter[];
    representation: TypeRepresentation;
}

export interface TypeParameter {
    name: Token;
    infer?: boolean;
}

export type TypeRepresentation =
    | MarkerTypeRepresentation
    | StructureTypeRepresentation
    | EnumerationTypeRepresentation
    | WrapperTypeRepresentation;

export interface MarkerTypeRepresentation {
    type: "marker";
    location: LocationRange;
}

export interface StructureTypeRepresentation {
    type: "structure";
    location: LocationRange;
    fields: FieldDefinition[];
}

export interface FieldDefinition {
    location: LocationRange;
    name: Token;
    type: Type;
}

export interface EnumerationTypeRepresentation {
    type: "enumeration";
    location: LocationRange;
    variants: VariantDefinition[];
}

export interface VariantDefinition {
    location: LocationRange;
    name: Token;
    elements: Type[];
}

export interface WrapperTypeRepresentation {
    type: "wrapper";
    location: LocationRange;
    inner: Type;
}

export interface TraitDefinitionStatement {
    type: "traitDefinition";
    location: LocationRange;
    comments: Comments;
    attributes: Attributes;
    name: Token;
    parameters: TypeParameter[];
    constraints: TraitConstraints;
}

export interface TraitConstraints {
    location: LocationRange;
    type: Type;
    constraints: Constraint[];
}

export interface ConstantDefinitionStatement {
    type: "constantDefinition";
    location: LocationRange;
    comments: Comments;
    attributes: Attributes;
    name: Token;
    constraints: ConstantConstraints;
}

export interface ConstantConstraints {
    location: LocationRange;
    type: Type;
    constraints: Constraint[];
}

export interface InstanceDefinitionStatement {
    type: "instanceDefinition";
    location: LocationRange;
    comments: Comments;
    attributes: Attributes;
    constraints: InstanceConstraints;
    value?: Expression;
}

export interface InstanceConstraints {
    location: LocationRange;
    bound: BoundConstraint;
    constraints: Constraint[];
}

export interface AssignmentStatement {
    type: "assignment";
    location: LocationRange;
    comments: Comments;
    pattern: Pattern;
    value: Expression;
}

export interface ExpressionStatement {
    type: "expression";
    location: LocationRange;
    comments: Comments;
    expression: Expression;
}

export interface EmptyStatement {
    type: "empty";
    location: LocationRange;
    comments: Comments;
}

export interface Comments {
    location: LocationRange;
    comments: Token[];
}
