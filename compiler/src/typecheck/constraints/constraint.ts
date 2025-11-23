import type { Type } from "..";
import type { Node } from "../../node";
import type { TypeParameterNode } from "../../nodes/types/parameter";
import type { Solver } from "../solve";

export abstract class Constraint {
    isActive = true;
    shouldInstantiate = true;

    abstract instantiate(
        solver: Solver,
        source: Node,
        replacements: Map<Node, Node>,
        substitutions: Map<TypeParameterNode, Type>,
    ): Constraint;

    abstract run(solver: Solver): void;

    waitUntilInstantiated() {
        this.isActive = false;
        return this;
    }
}
