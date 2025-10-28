import { BoundConstraint } from "./bound";
import { InstantiateConstraint } from "./instantiate";
import { TypeConstraint } from "./type";
import { DefaultConstraint } from "./default";
import { GenericConstraint } from "./generic";
import { Node } from "../../db";
import { Constraint } from "./constraint";
import { Solver } from "../solve";

/**
 * Instantiate constraints run first because they get type information from the
 * `HasConstraints` fact rather than the solver. Then form groups, add concrete
 * types, and finally resolve bounds.
 */
export const scores = ["group", "type", "instantiate", "default", "bound"] as const;
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

    run(solver: Solver, { until }: { until?: Score } = {}) {
        // Needed instead of a `for` loop because constraints can be added while
        // running.
        while (
            this.constraints.length > 0 &&
            (until == null || this.constraints[0].score() !== until)
        ) {
            const constraint = this.constraints.shift()!;
            constraint.run(solver);
        }
    }

    [Symbol.iterator]() {
        return this.constraints[Symbol.iterator]();
    }
}

/**
 * Used during instantiation. If there's already a replacement for
 * `node`, return it, otherwise create a new node.
 */
export const getOrInstantiate = (node: Node, source: Node, replacements: Map<Node, Node>): Node => {
    if (replacements.has(node)) {
        return replacements.get(node)!;
    } else {
        const instantiated = Node.instantiatedFrom(node, source);
        replacements.set(node, instantiated);
        return instantiated;
    }
};

export {
    Constraint,
    BoundConstraint,
    InstantiateConstraint,
    TypeConstraint,
    DefaultConstraint,
    GenericConstraint,
};
