import { Solver } from "../solve";
import { Fact, Node } from "../../db";
import { HasInstance, Instance } from "../../visit/visitor";
import { displayType, instantiateType, Type, TypeParameter, typesAreEqual } from "./type";
import chalk from "chalk";
import { InstantiateConstraint, Score } from ".";
import { Constraint } from "./constraint";
import stripAnsi from "strip-ansi";

export interface Bound {
    source: Node;
    trait: Node;
    substitutions: Map<TypeParameter, Type>;
    fromConstraint?: boolean;
    instantiated?: boolean;
}

export const cloneBound = (bound: Bound) => ({
    ...bound,
    substitutions: new Map(bound.substitutions),
});

export const displayBound = (bound: Bound) =>
    `${bound.trait.code}${bound.substitutions
        .values()
        .map((type) => ` ${displayType(type, false)}`)
        .toArray()
        .join("")}`;

export const applyBound = (bound: Bound, solver: Solver): Bound => ({
    ...bound,
    substitutions: new Map(
        bound.substitutions.entries().map(([parameter, type]) => [parameter, solver.apply(type)]),
    ),
});

interface BoundLike {
    trait: Node;
    substitutions: Map<TypeParameter, Type>;
}

export const boundTypesAreEqual = (left: BoundLike, right: BoundLike) =>
    left.trait === right.trait &&
    left.substitutions.size === right.substitutions.size &&
    Array.from(left.substitutions.entries()).every(([parameter, leftType]) => {
        const rightType = right.substitutions.get(parameter);
        return rightType != null && typesAreEqual(leftType, rightType);
    });

export class HasResolvedBound extends Fact<[bound: Bound, instance: Node]> {
    clone = ([bound, instance]: [Bound, Node]): [Bound, Node] => [cloneBound(bound), instance];

    display = ([bound, instance]: [Bound, Node]) =>
        `${chalk.blue(displayBound(bound))}, ${instance}`;
}

export class HasUnresolvedBound extends Fact<Bound> {
    clone = cloneBound;
    display = (bound: Bound) => chalk.blue(displayBound(bound));
}

export class BoundConstraint extends Constraint {
    node: Node;
    bound: Bound;

    constructor(node: Node, bound: Bound) {
        super();
        this.node = node;
        this.bound = bound;
    }

    score(): Score {
        return "bound";
    }

    instantiate(
        solver: Solver,
        source: Node,
        replacements: Map<Node, Node>,
        substitutions: Map<TypeParameter, Type>,
    ): this | undefined {
        if (source === this.node) {
            return undefined; // recursive bound
        }

        const bound: Bound = {
            source,
            trait: this.bound.trait,
            substitutions: new Map(
                this.bound.substitutions
                    .entries()
                    .map(([parameter, substitution]) => [
                        parameter,
                        instantiateType(substitution, source, replacements, substitutions),
                    ]),
            ),
            fromConstraint: this.bound.fromConstraint,
            instantiated: true,
        };

        const constraint = new BoundConstraint(this.node, bound) as this;

        if (constraint.bound.fromConstraint) {
            solver.imply(constraint.asInstance());
        }

        return constraint;
    }

    asInstance(): Instance {
        return {
            node: this.node,
            trait: this.bound.trait,
            substitutions: this.bound.substitutions,
        };
    }

    run(solver: Solver) {
        const { source, trait, substitutions, fromConstraint, instantiated } = this.bound;

        if (source === trait && !instantiated) {
            // Traits themselves stand alone
            return;
        }

        if (fromConstraint && !instantiated) {
            // Assume bounds within the current definition have instances
            // available, so there's nothing to do for the bound constraint
            // itself
            return;
        }

        // These are for the *trait's* parameters
        const boundSubstitutions = new Map<TypeParameter, Type>();
        const boundInferred = new Map<TypeParameter, Type>();
        for (const [parameter, type] of substitutions) {
            // NOTE: No need to instantiate `type` here; the bound has already
            // been instantiated
            if (parameter.infer) {
                boundInferred.set(parameter, type);
            } else {
                boundSubstitutions.set(parameter, type);
            }
        }

        const instances = solver.db.list(trait, HasInstance).toArray();

        const { nonDefaultInstances = [], defaultInstances = [] } = Object.groupBy(
            instances,
            (instance) => (instance.default ? "defaultInstances" : "nonDefaultInstances"),
        );

        const instanceGroups = [
            { instances: solver.impliedInstances, instantiate: false },
            { instances: nonDefaultInstances, instantiate: true },
            { instances: defaultInstances, instantiate: true },
        ];

        for (let i = 0; i < instanceGroups.length; i++) {
            const { instances, instantiate } = instanceGroups[i];
            const isLastInstanceSet = i + 1 === instanceGroups.length;

            let candidates: [
                instanceNode: Node,
                copy: Solver,
                inferredParameters: Map<TypeParameter, Type>,
            ][] = [];

            for (const instance of instances) {
                if (instance.trait !== trait) {
                    continue;
                }

                const copy = Solver.from(solver);
                copy.implyInstances = false;
                copy.impliedInstances = [...solver.impliedInstances];

                // These are for the *instance's own* parameters, not the trait
                // parameters like with the bound
                const replacements = new Map<Node, Node>();
                const substitutions = new Map<TypeParameter, Type>();
                if (instantiate) {
                    copy.add(
                        new InstantiateConstraint({
                            source: this.node,
                            definition: instance.node,
                            replacements,
                            substitutions,
                        }),
                    );
                }

                // Run the solver (excluding bounds) to populate `replacements`
                copy.run({ until: "bound" });

                // These are for the *trait's* parameters
                const instanceSubstitutions = new Map<TypeParameter, Type>();
                const instanceInferred = new Map<TypeParameter, Type>();
                for (let [parameter, substitution] of instance.substitutions) {
                    substitution = instantiate
                        ? instantiateType(substitution, this.node, replacements, substitutions)
                        : substitution;

                    if (parameter.infer) {
                        instanceInferred.set(parameter, substitution);
                    } else {
                        instanceSubstitutions.set(parameter, substitution);
                    }
                }

                for (const [parameter, instanceType] of instanceSubstitutions) {
                    const boundType = boundSubstitutions.get(parameter);
                    if (boundType != null) {
                        copy.unify(instanceType, boundType);
                    } else if (!instanceInferred.has(parameter)) {
                        throw new Error("missing parameter in bound substitutions");
                    }
                }

                if (!copy.error) {
                    candidates.push([instance.node, copy, instanceInferred]);
                }
            }

            for (const [parameter, type] of boundInferred) {
                boundSubstitutions.set(parameter, type);
            }

            const resolvedBound: Bound = {
                source,
                trait,
                substitutions: boundSubstitutions,
            };

            if (candidates.length === 1) {
                const [[instanceNode, copy, instanceInferred]] = candidates;

                solver.replaceWith(copy);
                solver.constraints.add(...copy.constraints);

                for (const [parameter, instanceType] of instanceInferred) {
                    const boundType = boundInferred.get(parameter);
                    if (boundType == null) {
                        throw new Error("missing parameter in bound substitutions");
                    }

                    solver.unify(boundType, instanceType);
                }

                // Don't indicate a resolved instance if this instance is
                // implied (suppresses custom error messages)
                if (solver.impliedInstances.every((instance) => instance.node !== instanceNode)) {
                    solver.db.add(
                        source,
                        new HasResolvedBound([applyBound(resolvedBound, solver), instanceNode]),
                    );
                }

                break;
            }

            if (isLastInstanceSet) {
                solver.db.add(source, new HasUnresolvedBound(applyBound(resolvedBound, solver)));
            }
        }

        solver.applyQueue.push(substitutions);
    }
}
