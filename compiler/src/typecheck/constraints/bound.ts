import { Solver } from "../solve";
import { Fact, Node } from "../../db";
import { HasConstraints, HasInstance, Instance } from "../../visit/visitor";
import { displayType, Type } from "./type";
import chalk from "chalk";
import { IsInferredTypeParameter } from "../../visit/statements/trait-definition";
import { getOrInstantiate, InstantiateConstraint, Score } from ".";
import { Constraint } from "./constraint";

export interface Bound<S = Node> {
    source: Node | undefined;
    definition: Node | undefined;
    trait: Node;
    substitutions: Map<Node, S>;
}

export const cloneBound = (bound: Bound<Type>) => ({
    ...bound,
    substitutions: new Map(bound.substitutions),
});

export const displayBound = (bound: Bound<Type>) =>
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

export class HasResolvedBound extends Fact<[bound: Bound<Type>, instance: Node]> {
    clone = ([bound, instance]: [Bound<Type>, Node]): [Bound<Type>, Node] => [
        cloneBound(bound),
        instance,
    ];

    display = ([bound, instance]: [Bound<Type>, Node]) =>
        `${chalk.blue(displayBound(bound))}, ${instance}`;
}

export class HasUnresolvedBound extends Fact<Bound<Type>> {
    clone = cloneBound;
    display = (bound: Bound<Type>) => chalk.blue(displayBound(bound));
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

    equals(other: Constraint): boolean {
        if (!(other instanceof BoundConstraint)) {
            return false;
        }

        return this.node === other.node && this.bound === other.bound;
    }

    instantiate(
        source: Node,
        replacements: Map<Node, Node>,
        _substitutions: Map<Node, Node>,
    ): this | undefined {
        return new BoundConstraint(this.node, {
            source,
            definition: undefined, // only used on the generic definition
            trait: this.bound.trait,
            substitutions: new Map(
                this.bound.substitutions
                    .entries()
                    .map(([parameter, node]) => [
                        parameter,
                        getOrInstantiate(node, source, replacements),
                    ]),
            ),
        }) as this;
    }

    run(solver: Solver) {
        const { source, definition, trait } = this.bound;

        const isInferredParameter = (parameter: Node) =>
            solver.db.has(parameter, IsInferredTypeParameter);

        const boundSubstitutions = new Map<Node, Node>();
        const boundInferred = new Map<Node, Node>();
        for (const [parameter, type] of this.bound.substitutions) {
            // NOTE: No need to instantiate `type` here; the bound has already
            // been instantiated
            if (isInferredParameter(parameter)) {
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
        const boundInstances =
            definition != null
                ? solver.db
                      .list(definition, HasConstraints)
                      .flatMap((constraints) => constraints)
                      .filter((constraint) => constraint instanceof BoundConstraint)
                      .filter((constraint) => constraint.bound.trait === this.bound.trait)
                      .map(
                          (constraint): Instance => ({
                              node: constraint.node,
                              substitutions: new Map(constraint.bound.substitutions),
                          }),
                      )
                      .toArray()
                : [];

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
                inferredParameters: Map<Node, Type>,
            ][] = [];

            for (const instance of instances) {
                const copy = Solver.from(solver);

                const recursiveInstance = copy.instanceStack.find(
                    (entry) => entry.instance === instance.node,
                );

                if (recursiveInstance != null) {
                    // Override any other candidates
                    candidates = [[recursiveInstance.node, copy, new Map()]];
                    break;
                }

                copy.instanceStack.push({
                    node: this.node,
                    instance: instance.node,
                });

                // These are for the *instance's own* parameters, not
                // the trait parameters like with the bound
                const replacements = instantiate ? new Map<Node, Node>() : undefined;
                if (replacements != null && source != null) {
                    copy.add(
                        new InstantiateConstraint({
                            source,
                            definition: instance.node,
                            replacements,
                            substitutions: new Map<Node, Node>(),
                        }),
                    );
                    copy.run(); // needed here to populate `replacements`
                }

                // These are for the *trait's* parameters
                const instanceSubstitutions = new Map<Node, Node>();
                const instanceInferred = new Map<Node, Node>();
                for (const [parameter, substitution] of instance.substitutions) {
                    const replacement =
                        replacements != null && source != null
                            ? getOrInstantiate(substitution, source, replacements)
                            : substitution;

                    if (replacement == null) {
                        throw new Error("missing replacement in instantiated instance");
                    }

                    if (isInferredParameter(parameter)) {
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

                copy.instanceStack.pop();

                if (!copy.error) {
                    candidates.push([instance.node, copy, instanceInferred]);
                }
            }

            const resolvedBound: Bound = {
                source,
                definition,
                trait,
                substitutions: boundSubstitutions,
            };

            for (const [parameter, type] of boundInferred) {
                resolvedBound.substitutions.set(parameter, type);
            }

            if (candidates.length === 1) {
                const [[instanceNode, copy, instanceInferred]] = candidates;

                solver.replaceWith(copy);

                for (const [parameter, instanceType] of instanceInferred) {
                    const boundType = boundInferred.get(parameter);
                    if (boundType == null) {
                        throw new Error("missing parameter in bound substitutions");
                    }

                    solver.unify(boundType, instanceType);
                }

                if (source != null) {
                    solver.db.add(
                        source,
                        new HasResolvedBound([applyBound(resolvedBound, solver), instanceNode]),
                    );
                }

                break;
            }

            if (isLastInstanceSet && source != null) {
                solver.db.add(source, new HasUnresolvedBound(applyBound(resolvedBound, solver)));
            }
        }

        solver.applyQueue.push(this.bound.substitutions);
    }
}
