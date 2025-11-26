import type { ConstructedType, Type } from "..";
import { getOrInstantiate, instantiateType } from "..";
import { Node } from "../../node";
import type { TypeParameterNode } from "../../nodes/types/parameter";
import type { Solver } from "../solve";
import { Constraint } from "./constraint";
import { GroupConstraint } from "./group";

export class TypeConstraint extends Constraint {
    node: Node;
    type: ConstructedType;

    constructor(node: Node, type: ConstructedType) {
        super();
        this.node = node;
        this.type = type;
    }

    instantiate(
        _solver: Solver,
        source: Node,
        replacements: Map<Node, Node>,
        substitutions: Map<TypeParameterNode, Type>,
    ): Constraint {
        const node = getOrInstantiate(this.node, source, replacements);
        const type = instantiateType(this.type, source, replacements, substitutions);

        return type instanceof Node
            ? new GroupConstraint(node, type)
            : new TypeConstraint(node, type);
    }

    run(solver: Solver): boolean {
        solver.unify(this.node, this.type);
        return true;
    }
}
