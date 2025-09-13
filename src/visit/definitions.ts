import { Node } from "../db";
import { Token } from "../syntax";
import {
    ConstantAttributes,
    InstanceAttributes,
    TraitAttributes,
    TypeAttributes,
} from "./attributes";

export type Definition =
    | VariableDefinition
    | ConstantDefinition
    | TypeDefinition
    | TraitDefinition
    | InstanceDefinition
    | TypeParameterDefinition;

export interface VariableDefinition {
    type: "variable";
    node: Node;
}

export interface ConstantDefinition {
    type: "constant";
    node: Node;
    comments: Token[];
    attributes: ConstantAttributes;
    value: { assigned: true; node: Node } | { assigned: false; type: Node };
}

export interface TypeDefinition {
    type: "type";
    node: Node;
    comments: Token[];
    attributes: TypeAttributes;
    parameters: Node[];
}

export interface TraitDefinition {
    type: "trait";
    node: Node;
    comments: Token[];
    attributes: TraitAttributes;
    parameters: Node[];
}

export interface InstanceDefinition {
    type: "instance";
    node: Node;
    comments: Token[];
    attributes: InstanceAttributes;
    trait: Node;
    value: Node;
    // substitutions are added via facts
}

export interface TypeParameterDefinition {
    type: "typeParameter";
    node: Node;
    infer?: boolean;
}
