import type { Solver } from "../solve";
import { Constraint } from "./constraint";
import { Node } from "../../node";
import type { TypeParameterNode } from "../../nodes/types/parameter";
import type { Type } from "..";
import { getOrInstantiate, instantiateType } from "..";

export class DefaultConstraint extends Constraint {
    node: Node;
    type: Type;

    constructor(node: Node, type: Type) {
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

        return new DefaultConstraint(node, type);
    }

    run(solver: Solver): boolean {
        if (solver.apply(this.node) instanceof Node) {
            solver.unify(this.node, this.type);
        }

        return true;
    }
}
