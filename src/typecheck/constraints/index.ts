import { Solver } from "../solve";
import { BoundConstraint } from "./bound";
import { InstantiateConstraint } from "./instantiate";
import { Type, TypeConstraint } from "./type";
import { Node } from "../../db";

/**
 * Constraints are produced during the `visit` stage and add type information to
 * the program.
 */
export abstract class Constraint {
    /**
     * Used to order constraints (see `scores` below). For example, `group`
     * constraints have a higher score than `type` constraints so that groups
     * are formed before concrete types are applied; similarly, `bound`
     * constraints have a lower score than `type` constraints so that bound
     * resolution has access to concrete type information.
     */
    abstract score(): Score;

    /**
     * Produce a deep copy of this constraint, ignoring type parameters. This is
     * used when resolving generic constants and bounds, so the "concrete" type
     * parameter can be substituted with a real type from the use site. Without
     * this, the typechecker would try to unify type parameters with other
     * concrete types, causing errors.
     */
    abstract instantiate(
        source: Node | undefined,
        replacements: Map<Node, Node>,
        substitutions: Map<Node, Type>,
    ): this | undefined;

    /**
     * Add the type information in this constraint to the solver.
     */
    abstract run(solver: Solver): void;
}

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

export { BoundConstraint, InstantiateConstraint, TypeConstraint };
