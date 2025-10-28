import { Score } from ".";
import { Constraint, Solver } from "..";
import { Node } from "../../db";
import { Type, TypeParameter } from "./type";

export class GenericConstraint extends Constraint {
    constraint: Constraint;

    constructor(constraint: Constraint) {
        super();
        this.constraint = constraint;
    }

    score(): Score {
        return this.constraint.score();
    }

    instantiate(
        _solver: Solver,
        _source: Node,
        _replacements: Map<Node, Node>,
        _substitutions: Map<TypeParameter, Type>,
    ): this | undefined {
        return undefined;
    }

    run(solver: Solver): void {
        this.constraint.run(solver);
    }
}
