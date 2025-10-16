import { Solver } from "../solve";
import { Fact, Node } from "../../db";
import { HasInstance } from "../../visit/visitor";
import { displayType, Type } from "./type";
import chalk from "chalk";
import { IsInferredTypeParameter } from "../../visit/statements/trait-definition";
import { getOrInstantiate, InstantiateConstraint, Score } from ".";
import { Constraint } from "./constraint";

export interface Bound<S = Node> {
    source: Node | undefined;
    trait: Node;
    substitutions: Map<Node, S>;
}

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
    display = ([bound, instance]: [Bound, Node]) =>
        `${chalk.blue(displayBound(bound))}, ${instance}`;
}

export class HasUnresolvedBound extends Fact<Bound<Type>> {
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
        // Ignore bounds on generic definitions in favor of the ones created
        // during instantiation (which have a source attached)
        if (this.bound.source == null) {
            return;
        }

        const isInferredParameter = (parameter: Node) =>
            solver.db.has(parameter, IsInferredTypeParameter);

        const { source, trait } = this.bound;
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

        const instanceGroups = [nonDefaultInstances, defaultInstances];

        for (let i = 0; i < instanceGroups.length; i++) {
            const instances = instanceGroups[i];
            const isLastInstanceSet = i + 1 === instanceGroups.length;

            const candidates: [
                instanceNode: Node,
                copy: Solver,
                inferredParameters: Map<Node, Type>,
            ][] = [];

            for (const instance of instances) {
                const copy = Solver.from(solver);

                // These are for the *instance's own* parameters, not
                // the trait parameters like with the bound
                const replacements = new Map<Node, Node>();
                const substitutions = new Map<Node, Node>();
                copy.add(
                    new InstantiateConstraint({
                        source,
                        definition: instance.node,
                        replacements,
                        substitutions,
                    }),
                );
                copy.run(); // needed here to populate `replacements`

                // These are for the *trait's* parameters
                const instanceSubstitutions = new Map<Node, Node>();
                const instanceInferred = new Map<Node, Node>();
                for (const [parameter, substitution] of instance.substitutions) {
                    const replacement = getOrInstantiate(substitution, source, replacements);
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

                if (!copy.error) {
                    candidates.push([instance.node, copy, instanceInferred]);
                }
            }

            const resolvedBound: Bound = {
                source,
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

                solver.db.add(
                    source,
                    new HasResolvedBound([applyBound(resolvedBound, solver), instanceNode]),
                );

                break;
            }

            if (isLastInstanceSet) {
                solver.db.add(source, new HasUnresolvedBound(applyBound(resolvedBound, solver)));
            }
        }

        solver.applyQueue.push(this.bound.substitutions);
    }
}
