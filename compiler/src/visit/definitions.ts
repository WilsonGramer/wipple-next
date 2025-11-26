import { Fact } from "../db";
import type { Node } from "../node";
import type { VariablePatternNode } from "../nodes/patterns/variable";
import type { ConstantDefinitionNode } from "../nodes/statements/constant-definition";
import type { InstanceDefinitionNode } from "../nodes/statements/instance-definition";
import type { TraitDefinitionNode } from "../nodes/statements/trait-definition";
import type { TypeDefinitionNode } from "../nodes/statements/type-definition";
import type { TypeParameterNode } from "../nodes/types/parameter";
import type {
    ConstantAttributes,
    InstanceAttributes,
    TraitAttributes,
    TypeAttributes,
} from "./attributes";

export class Defined extends Fact<Definition> {
    display(): string {
        return "is a definition";
    }
}

export abstract class Definition<N extends Node = Node> {
    node: N;
    comments: string[];

    constructor(node: N, comments: string[]) {
        this.node = node;
        this.comments = comments;
    }
}

export class VariableDefinition extends Definition<VariablePatternNode> {
    value: Node;

    constructor(node: VariablePatternNode, value: Node) {
        super(node, []);
        this.value = value;
    }
}

export class ConstantDefinition extends Definition<ConstantDefinitionNode> {
    attributes: ConstantAttributes;
    value: { assigned: true; node: Node } | { assigned: false; type: Node };

    constructor(
        node: ConstantDefinitionNode,
        comments: string[],
        attributes: ConstantAttributes,
        type: Node,
    ) {
        super(node, comments);
        this.attributes = attributes;
        this.value = { assigned: false, type };
    }
}

export class TypeDefinition extends Definition<TypeDefinitionNode> {
    attributes: TypeAttributes;
    parameters: TypeParameterNode[];

    constructor(
        node: TypeDefinitionNode,
        comments: string[],
        attributes: TypeAttributes,
        parameters: TypeParameterNode[],
    ) {
        super(node, comments);
        this.attributes = attributes;
        this.parameters = parameters;
    }
}

export class TraitDefinition extends Definition<TraitDefinitionNode> {
    attributes: TraitAttributes;
    parameters: TypeParameterNode[];

    constructor(
        node: TraitDefinitionNode,
        comments: string[],
        attributes: TraitAttributes,
        parameters: TypeParameterNode[],
    ) {
        super(node, comments);
        this.attributes = attributes;
        this.parameters = parameters;
    }
}

export class InstanceDefinition extends Definition<InstanceDefinitionNode> {
    attributes: InstanceAttributes;
    value: Node | undefined;

    constructor(
        node: InstanceDefinitionNode,
        comments: string[],
        attributes: InstanceAttributes,
        value: Node | undefined,
    ) {
        super(node, comments);
        this.attributes = attributes;
        this.value = value;
    }
}

export class TypeParameterDefinition extends Definition<TypeParameterNode> {
    constructor(node: TypeParameterNode) {
        super(node, []);
    }
}

export class MarkerConstructorDefinition extends Definition<Node> {
    constructor(node: Node, comments: string[]) {
        super(node, comments);
    }
}

export class StructureConstructorDefinition extends Definition<Node> {
    fields: Map<string, Node>;

    constructor(node: Node, comments: string[], fields: Map<string, Node>) {
        super(node, comments);
        this.fields = fields;
    }
}

export class VariantConstructorDefinition extends Definition<Node> {
    index: number;

    constructor(node: Node, index: number) {
        super(node, []);
        this.index = index;
    }
}
