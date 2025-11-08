import { BoundConstraint } from "./bound";
import { InstantiateConstraint } from "./instantiate";
import { TypeConstraint } from "./type";
import { GenericOnlyConstraint } from "./generic-only";
import { Node } from "../../db";
import { Constraint } from "./constraint";
import { Solver } from "../solve";
import { DefaultConstraint } from "./default";

export const scores = ["group", "type", "instantiate", "bound", "default"] as const;
export type Score = (typeof scores)[number];

export class Constraints {
    private constraints: Record<Score, Constraint[]>;

    constructor() {
        this.constraints = Object.fromEntries(scores.map((score) => [score, []])) as any;
    }

    add(...constraints: Constraint[]) {
        for (const constraint of constraints) {
            this.constraints[constraint.score()].push(constraint);
        }
    }

    run(solver: Solver, { until }: { until?: Score } = {}) {
        while (true) {
            const constraint = this.peek();
            if (constraint == null || constraint.score() === until) {
                break;
            }

            this.shift();

            constraint.run(solver);
        }
    }

    private shift() {
        for (const key of scores) {
            const next = this.constraints[key].shift();
            if (next != null) {
                return next;
            }
        }
    }

    private peek() {
        return this[Symbol.iterator]().next().value;
    }

    *[Symbol.iterator]() {
        for (const key of scores) {
            for (const constraint of this.constraints[key]) {
                yield constraint;
            }
        }
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
    DefaultConstraint,
    InstantiateConstraint,
    TypeConstraint,
    GenericOnlyConstraint,
};
