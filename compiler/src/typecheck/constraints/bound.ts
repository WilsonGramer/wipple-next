import { Solver } from "../solve";
import { Fact, Node } from "../../db";
import { HasConstraints, HasInstance, Instance } from "../../visit/visitor";
import { displayType, instantiateType, Type, TypeParameter } from "./type";
import chalk from "chalk";
import { InstantiateConstraint, Score } from ".";
import { Constraint } from "./constraint";

export interface Bound {
    sources: (Node | undefined)[];
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

export const applyBound = (bound: Bound, solver: Solver) => ({
    ...bound,
    substitutions: new Map(
        bound.substitutions.entries().map(([parameter, type]) => [parameter, solver.apply(type)]),
    ),
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
        sources: (Node | undefined)[],
        definition: Node,
        replacements: Map<Node, Node>,
        substitutions: Map<TypeParameter, Type>,
    ): this | undefined {
        if (sources.includes(this.node)) {
            return undefined; // recursive bound
        }

        const bound: Bound = {
            sources: [...sources, ...this.bound.sources, definition],
            trait: this.bound.trait,
            substitutions: new Map(
                this.bound.substitutions
                    .entries()
                    .map(([parameter, substitution]) => [
                        parameter,
                        instantiateType(
                            substitution,
                            sources.find((source) => source != null)!,
                            replacements,
                            substitutions,
                        ),
                    ]),
            ),
            fromConstraint: this.bound.fromConstraint,
            instantiated: true,
        };

        return new BoundConstraint(this.node, bound) as this;
    }

    run(solver: Solver) {
        const { sources, trait, substitutions, fromConstraint, instantiated } = this.bound;

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

        // Assume bounds within the current definition have instances available
        const boundInstances = sources
            .filter((source) => source != null)
            .flatMap((source) =>
                solver.db
                    .list(source, HasConstraints)
                    .flatMap((constraints) => constraints)
                    .filter((constraint) => constraint instanceof BoundConstraint)
                    .filter(
                        (constraint) =>
                            constraint.bound.trait === this.bound.trait &&
                            constraint.bound.fromConstraint === true,
                    )
                    .map(
                        (constraint): Instance => ({
                            node: constraint.node,
                            substitutions: new Map(constraint.bound.substitutions),
                        }),
                    )
                    .toArray(),
            );

        const instanceGroups = [
            { instances: boundInstances, instantiate: false },
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
                const copy = Solver.from(solver);

                // These are for the *instance's own* parameters, not the trait
                // parameters like with the bound
                const replacements = instantiate ? new Map<Node, Node>() : undefined;
                if (replacements != null) {
                    copy.add(
                        new InstantiateConstraint({
                            sources: [...sources, this.node],
                            definition: instance.node,
                            replacements,
                            substitutions: new Map<TypeParameter, Type>(),
                        }),
                    );
                }

                // Run the solver (excluding bounds) to populate `replacements`
                copy.instanceStack.push(instance.node);
                copy.run({ until: "bound" }); // this will also store the current instance stack in any bounds (see `instantiate` above)
                copy.instanceStack.pop();

                // These are for the *trait's* parameters
                const instanceSubstitutions = new Map<TypeParameter, Type>();
                const instanceInferred = new Map<TypeParameter, Type>();
                for (const [parameter, substitution] of instance.substitutions) {
                    const replacement =
                        replacements != null
                            ? instantiateType(
                                  substitution,
                                  this.node,
                                  replacements,
                                  instanceSubstitutions,
                              )
                            : substitution;

                    if (replacement == null) {
                        throw new Error("missing replacement in instantiated instance");
                    }

                    if (parameter.infer) {
                        instanceInferred.set(parameter, replacement);
                    } else {
                        instanceSubstitutions.set(parameter, replacement);
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
                sources,
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

                solver.db.add(
                    sources.find((source) => source != null)!,
                    new HasResolvedBound([applyBound(resolvedBound, solver), instanceNode]),
                );

                break;
            }

            if (isLastInstanceSet) {
                solver.db.add(
                    sources.find((source) => source != null)!,
                    new HasUnresolvedBound(applyBound(resolvedBound, solver)),
                );
            }
        }

        solver.applyQueue.push(substitutions);
    }
}
