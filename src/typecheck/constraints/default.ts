import { Score } from ".";
import { Solver, TypeConstraint } from "..";
import { Node } from "../../db";

export class DefaultConstraint extends TypeConstraint {
    source: Node | undefined;

    override score(): Score {
        return "default";
    }

    override instantiate(
        source: Node,
        replacements: Map<Node, Node>,
        substitutions: Map<Node, Node>,
    ): this | undefined {
        const instantiatedTypeConstraint = super.instantiate(source, replacements, substitutions);
        if (instantiatedTypeConstraint == null) {
            return undefined;
        }

        const constraint = new DefaultConstraint(
            instantiatedTypeConstraint.node,
            instantiatedTypeConstraint.type,
        );

        constraint.source = source;

        return constraint as this;
    }

    override run(solver: Solver): void {
        // Ignore defaults on generic definitions in favor of the ones created
        // during instantiation (which have a source attached)
        if (this.source == null) {
            return;
        }

        if (solver.apply(this.node) instanceof Node) {
            super.run(solver);
        }
    }
}
