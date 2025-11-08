import { Node } from "../../db";
import { Solver } from "../solve";
import { getOrInstantiate, Score } from ".";
import { Constraint } from "./constraint";
import { instantiateType, Type, TypeParameter } from "./type";

export class DefaultConstraint extends Constraint {
    node: Node;
    type: Type;

    constructor(node: Node, type: Type) {
        super();
        this.node = node;
        this.type = type;
    }

    score(): Score {
        return "bound"; // default and bound constraints are resolved in source code order
    }

    instantiate(
        _solver: Solver,
        source: Node,
        replacements: Map<Node, Node>,
        substitutions: Map<TypeParameter, Type>,
    ): this | void {
        const node = getOrInstantiate(this.node, source, replacements);
        const type = instantiateType(this.type, source, replacements, substitutions);

        return new DefaultConstraint(node, type) as this;
    }

    run(solver: Solver): void {
        if (solver.apply(this.node) instanceof Node) {
            solver.unify(this.node, this.type);
        }
    }
}
