import { Node } from "../db";
import { Comments } from "../syntax";
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
    | ConstructorDefinition;

export interface VariableDefinition {
    type: "variable";
    node: Node;
}

export interface ConstantDefinition {
    type: "constant";
    node: Node;
    comments: Comments;
    attributes: ConstantAttributes;
    value: { assigned: true; node: Node } | { assigned: false; type: () => Node };
}

export interface TypeDefinition {
    type: "type";
    node: Node;
    comments: Comments;
    attributes: TypeAttributes;
    parameters: Node[];
}

export interface TraitDefinition {
    type: "trait";
    node: Node;
    comments: Comments;
    attributes: TraitAttributes;
    parameters: Node[];
}

export interface InstanceDefinition {
    type: "instance";
    node: Node;
    comments: Comments;
    attributes: InstanceAttributes;
    value: () => Node | undefined;
    // substitutions are added via facts
}

export interface TypeParameterDefinition {
    type: "typeParameter";
    node: Node;
    name: string;
    infer?: boolean;
}

export interface ConstructorDefinition {
    type: "constructor";
    node: Node;
    comments: Comments;
}
