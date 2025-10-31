import { Score } from ".";
import { Constraint, Solver } from "..";
import { Node } from "../../db";
import { Type, TypeParameter } from "./type";

export class GenericOnlyConstraint extends Constraint {
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
    ): this | void {
        return undefined;
    }

    run(solver: Solver): this | void {
        const requeued = this.constraint.run(solver);
        return requeued && (new GenericOnlyConstraint(requeued) as this);
    }
}
