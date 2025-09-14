import { BoundConstraint } from "./bound";
import { InstantiateConstraint } from "./instantiate";
import { TypeConstraint } from "./type";
import { Node } from "../../db";
import { Constraint } from "./constraint";
import { Solver } from "../solve";

/**
 * Instantiate constraints run first because they get type information from the
 * `HasConstraints` fact rather than the solver. Then form groups, add concrete
 * types, and finally resolve bounds.
 */
export const scores = ["instantiate", "group", "type", "bound"] as const;
export type Score = (typeof scores)[number];

export class Constraints {
    constraints: Constraint[];

    constructor(constraints: Constraint[] = []) {
        this.constraints = constraints;
    }

    add(...constraints: Constraint[]) {
        this.constraints.push(...constraints);
        this.constraints.sort((a, b) => scores.indexOf(a.score()) - scores.indexOf(b.score()));
    }

    run(solver: Solver) {
        // Needed instead of a `for` loop because constraints can be added while
        // running.
        while (this.constraints.length > 0) {
            const constraint = this.constraints.shift()!;
            constraint.run(solver);
        }
    }
}

/**
 * Used during instantiation. If there's already a substitution/replacement for
 * `node`, return it, otherwise create a new node.
 */
export const getOrInstantiate = <T>(
    node: Node,
    source: Node | undefined,
    substitutions: Map<Node, T | Node>,
    replacements?: Map<Node, Node>, // provided if `substitutions` keys are type parameters
): T | Node => {
    if (substitutions.has(node)) {
        return substitutions.get(node)!;
    } else {
        const instantiated =
            replacements != null
                ? getOrInstantiate(node, source, replacements)
                : Node.instantiatedFrom(node, source);

        substitutions.set(node, instantiated);

        return instantiated;
    }
};

export { Constraint, BoundConstraint, InstantiateConstraint, TypeConstraint };
