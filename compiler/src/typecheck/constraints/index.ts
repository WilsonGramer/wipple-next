import { BoundConstraint } from "./bound";
import { InstantiateConstraint } from "./instantiate";
import { TypeConstraint } from "./type";
import type { Constraint } from "./constraint";
import type { Solver } from "../solve";
import { DefaultConstraint } from "./default";
import { GroupConstraint } from "./group";

const constraintOrder: Function[][] = [
    [GroupConstraint],
    [TypeConstraint],
    [InstantiateConstraint],
    [BoundConstraint, DefaultConstraint],
];

export class Constraints {
    private constraints = new Map<Function[], Constraint[]>();

    add(...constraints: Constraint[]) {
        for (const constraint of constraints) {
            const key = constraintOrder.find((group) => group.includes(constraint.constructor))!;
            if (!this.constraints.has(key)) {
                this.constraints.set(key, []);
            }

            const groupConstraints = this.constraints.get(key)!;

            groupConstraints.push(constraint);
        }
    }

    runUntil<T extends abstract new (...args: any[]) => Constraint>(
        solver: Solver,
        until: T | undefined,
    ) {
        const requeuedConstraints: Constraint[] = [];
        while (true) {
            const constraint = this.peek();
            if (constraint == null || constraint.constructor === until) {
                break;
            }

            this.shift();

            if (constraint.isActive) {
                const success = constraint.run(solver);

                if (!success) {
                    requeuedConstraints.push(constraint);
                }
            }
        }

        this.add(...requeuedConstraints);
    }

    private shift() {
        for (const key of constraintOrder) {
            if (this.constraints.get(key)?.shift() != null) {
                return;
            }
        }
    }

    private peek() {
        return this[Symbol.iterator]().next().value;
    }

    *[Symbol.iterator]() {
        for (const key of constraintOrder) {
            for (const constraint of this.constraints.get(key) ?? []) {
                yield constraint;
            }
        }
    }
}
