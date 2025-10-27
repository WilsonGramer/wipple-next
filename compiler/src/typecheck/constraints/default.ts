import { Score } from ".";
import { Solver, TypeConstraint } from "..";
import { Node } from "../../db";
import { Type, TypeParameter } from "./type";

export class DefaultConstraint extends TypeConstraint {
    instantiated = false;

    override score(): Score {
        return "default";
    }

    override instantiate(
        solver: Solver,
        source: Node,
        replacements: Map<Node, Node>,
        substitutions: Map<TypeParameter, Type>,
    ): this | undefined {
        const instantiatedTypeConstraint = super.instantiate(
            solver,
            source,
            replacements,
            substitutions,
        );

        if (instantiatedTypeConstraint == null) {
            return undefined;
        }

        const constraint = new DefaultConstraint(
            instantiatedTypeConstraint.node,
            instantiatedTypeConstraint.type,
        );

        constraint.instantiated = true;

        return constraint as this;
    }

    override run(solver: Solver): void {
        // Ignore defaults on generic definitions in favor of the ones created
        // during instantiation
        if (!this.instantiated) {
            return;
        }

        if (solver.apply(this.node) instanceof Node) {
            super.run(solver);
        }
    }
}
