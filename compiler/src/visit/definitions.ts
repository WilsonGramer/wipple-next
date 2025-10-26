import { Node } from "../db";
import { Token } from "../syntax/parser";
import { TypeParameter } from "../typecheck/constraints/type";
import {
    ConstantAttributes,
    InstanceAttributes,
    TraitAttributes,
    TypeAttributes,
} from "./attributes";

export type AnyDefinition =
    | VariableDefinition
    | ConstantDefinition
    | TypeDefinition
    | TraitDefinition
    | InstanceDefinition
    | TypeParameterDefinition
    | MarkerConstructorDefinition
    | StructureConstructorDefinition
    | VariantConstructorDefinition;

export interface VariableDefinition {
    type: "variable";
    node: Node;
}

export interface ConstantDefinition {
    type: "constant";
    node: Node;
    comments: Token[];
    attributes: ConstantAttributes;
    value: { assigned: true; node: Node } | { assigned: false; type: () => Node };
}

export interface TypeDefinition {
    type: "type";
    node: Node;
    comments: Token[];
    attributes: TypeAttributes;
    parameters: TypeParameter[];
}

export interface TraitDefinition {
    type: "trait";
    node: Node;
    comments: Token[];
    attributes: TraitAttributes;
    parameters: TypeParameter[];
}

export interface InstanceDefinition {
    type: "instance";
    node: Node;
    comments: Token[];
    attributes: InstanceAttributes;
    value: () => Node | undefined;
    // substitutions and other trait information is added via the `HasInstance` fact
}

export interface TypeParameterDefinition {
    type: "typeParameter";
    node: Node;
    name: string;
}

export interface MarkerConstructorDefinition {
    type: "markerConstructor";
    node: Node;
    comments: Token[];
}

export interface StructureConstructorDefinition {
    type: "structureConstructor";
    node: Node;
    comments: Token[];
    fields: Map<string, Node>;
}

export interface VariantConstructorDefinition {
    type: "variantConstructor";
    node: Node;
    comments: Token[];
    index: number;
}
