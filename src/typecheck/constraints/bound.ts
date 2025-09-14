import { Solver } from "../solve";
import { Fact, Node } from "../../db";
import { HasInstance } from "../../visit/visitor";
import { displayType, instantiateType, Type, typeReferencesNode } from "./type";
import chalk from "chalk";
import { IsInferredTypeParameter } from "../../visit/statements/trait-definition";
import { InstantiateConstraint, Score } from ".";
import { Constraint } from "./constraint";

export interface Bound {
    source: Node | undefined;
    trait: Node;
    substitutions: Map<Node, Type>;
}

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
    display = ([bound, instance]: [Bound, Node]) =>
        `${chalk.blue(displayBound(bound))}, ${instance}`;
}

export class HasUnresolvedBound extends Fact<Bound> {
    display = (bound: Bound) => chalk.blue(displayBound(bound));
}

export class BoundConstraint extends Constraint {
    bound: Bound;

    constructor(bound: Bound) {
        super();
        this.bound = bound;
    }

    score(): Score {
        return "bound";
    }

    instantiate(
        source: Node | undefined,
        replacements: Map<Node, Node>,
        substitutions: Map<Node, Type>,
    ): this | undefined {
        return new BoundConstraint({
            source,
            trait: this.bound.trait,
            substitutions: new Map(
                this.bound.substitutions
                    .entries()
                    .map(([parameter, type]) => [
                        parameter,
                        instantiateType(type, source, replacements, substitutions),
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
        const boundSubstitutions = new Map<Node, Type>();
        const boundInferredParameters = new Map<Node, Type>();
        for (const [parameter, type] of this.bound.substitutions) {
            // NOTE: No need to instantiate `type` here; the bound has already
            // been instantiated
            if (isInferredParameter(parameter)) {
                boundInferredParameters.set(parameter, type);
            } else {
                boundSubstitutions.set(parameter, type);
            }
        }

        const instances = solver.db.list(trait, HasInstance).toArray();

        const candidates: [
            instanceNode: Node,
            copy: Solver,
            inferredParameters: Map<Node, Type>,
        ][] = [];

        for (const [instance, instanceSubstitutions] of instances) {
            const copy = Solver.from(solver);

            const replacements = new Map<Node, Node>();
            const substitutions = new Map<Node, Type>();
            copy.add(
                new InstantiateConstraint({
                    source: undefined,
                    definition: instance,
                    replacements,
                    substitutions,
                }),
            );
            copy.run();

            const inferredParameters = new Map<Node, Type>();
            const instantiatedInstanceSubstitutions = new Map<Node, Type>();
            for (const [parameter, type] of instanceSubstitutions) {
                const instantiatedType = instantiateType(
                    // Apply the instance's type so it's not a Node anymore and
                    // thus may fail to unify (disqualifying the instance)
                    type,
                    source,
                    replacements,
                    substitutions,
                );

                if (isInferredParameter(parameter)) {
                    inferredParameters.set(parameter, instantiatedType);
                } else {
                    instantiatedInstanceSubstitutions.set(parameter, instantiatedType);
                }
            }

            for (const [parameter, instanceType] of instantiatedInstanceSubstitutions.entries()) {
                const boundType = boundSubstitutions.get(parameter);
                if (boundType != null) {
                    copy.unify(boundType, instanceType);
                } else if (!inferredParameters.has(parameter)) {
                    throw new Error("missing parameter in bound substitutions");
                }
            }

            if (!copy.error) {
                candidates.push([instance, copy, inferredParameters]);
            }
        }

        const resolvedBound: Bound = {
            source,
            trait,
            substitutions: boundSubstitutions,
        };

        for (const [parameter, type] of boundInferredParameters) {
            resolvedBound.substitutions.set(parameter, type);
        }

        if (candidates.length === 1) {
            const [[instanceNode, copy, instanceInferredParameters]] = candidates;

            solver.replaceWith(copy);

            for (const [inferredParameter, instanceType] of instanceInferredParameters) {
                const boundType = boundInferredParameters.get(inferredParameter);
                if (boundType == null) {
                    throw new Error("missing parameter in bound substitutions");
                }

                solver.unify(boundType, instanceType);
            }

            solver.db.add(
                source,
                new HasResolvedBound([applyBound(resolvedBound, solver), instanceNode]),
            );
        } else {
            solver.db.add(source, new HasUnresolvedBound(applyBound(resolvedBound, solver)));
        }
    }
}
