import type { Type } from "..";
import { getOrInstantiate } from "..";
import type { Node } from "../../node";
import type { TypeParameterNode } from "../../nodes/types/parameter";
import type { Solver } from "../solve";
import { Constraint } from "./constraint";

export class GroupConstraint extends Constraint {
    left: Node;
    right: Node;

    constructor(left: Node, right: Node) {
        super();
        this.left = left;
        this.right = right;
    }

    instantiate(
        _solver: Solver,
        source: Node,
        replacements: Map<Node, Node>,
        _substitutions: Map<TypeParameterNode, Type>,
    ): Constraint {
        const left = getOrInstantiate(this.left, source, replacements);
        const right = getOrInstantiate(this.right, source, replacements);

        return new GroupConstraint(left, right);
    }

    run(solver: Solver): boolean {
        solver.unify(this.left, this.right);
        return true;
    }
}
