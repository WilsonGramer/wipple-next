import { Solver } from "../solve";
import { Db, Fact, Node } from "../../db";
import { Definition, HasInstance, Instance } from "../../visit/visitor";
import { displayType, instantiateType, Type, TypeParameter, typesAreEqual } from "./type";
import chalk from "chalk";
import { InstantiateConstraint, Score } from ".";
import { Constraint } from "./constraint";
import { TraitDefinition } from "../../visit/definitions";

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

interface BoundLike {
    trait: Node;
    substitutions: Map<TypeParameter, Type>;
}

export const displayBound = (db: Db, bound: BoundLike) => {
    const traitDefinition = db.get(bound.trait, Definition)! as TraitDefinition;

    // This forces the order of the parameters to match the trait definition
    const parameterTypes = traitDefinition.parameters.map(
        (parameter) => bound.substitutions.get(parameter)!,
    );

    return `${bound.trait.code}${parameterTypes
        .map((type) => ` ${displayType(type, false)}`)
        .join("")}`;
};

export const applyBound = <T extends BoundLike>(bound: T, solver: Solver): T => ({
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

    display = ([bound, instance]: [Bound, Node], db: Db) =>
        `${chalk.blue(displayBound(db, bound))}, ${instance}`;
}

export class HasUnresolvedBound extends Fact<Bound> {
    clone = cloneBound;
    display = (bound: Bound, db: Db) => chalk.blue(displayBound(db, bound));
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
        _solver: Solver,
        source: Node,
        replacements: Map<Node, Node>,
        substitutions: Map<TypeParameter, Type>,
    ): this | void {
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

        return new BoundConstraint(this.node, bound) as this;
    }

    asInstance(): Instance {
        return {
            node: this.node,
            trait: this.bound.trait,
            substitutions: this.bound.substitutions,
        };
    }

    run(solver: Solver): this | void {
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

            let candidates: [instanceNode: Node, copy: Solver][] = [];

            for (const instance of instances) {
                if (instance.trait !== trait) {
                    continue;
                }

                const copy = Solver.from(solver);
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

                copy.error = false;
                unifySubstitutions(copy, instanceSubstitutions, boundSubstitutions);
                if (!copy.error) {
                    unifySubstitutions(copy, instanceInferred, boundInferred);
                    candidates.push([instance.node, copy]);
                }
            }

            const resolvedBound: Bound = {
                source,
                trait,
                substitutions: new Map([...boundSubstitutions, ...boundInferred]),
            };

            if (candidates.length === 1) {
                const [[instanceNode, copy]] = candidates;

                solver.inherit(copy);
                solver.add(...copy.constraints); // add the remaining bound constraints

                // Don't indicate a resolved instance if this instance is
                // implied (suppresses custom `[error]` messages)
                const isImpliedInstance = solver.impliedInstances.some(
                    (instance) => instance.node === instanceNode,
                );

                if (!isImpliedInstance) {
                    solver.db.add(
                        source,
                        new HasResolvedBound([applyBound(resolvedBound, solver), instanceNode]),
                    );
                }

                break;
            }

            if (isLastInstanceSet) {
                // Retry bound after applying defaults
                if (!solver.appliedDefaults) {
                    return this;
                }

                solver.db.add(source, new HasUnresolvedBound(applyBound(resolvedBound, solver)));
            }
        }

        solver.applyQueue.push(substitutions);
    }
}

const unifySubstitutions = (
    solver: Solver,
    left: Map<TypeParameter, Type>,
    right: Map<TypeParameter, Type>,
) => {
    for (const [parameter, leftType] of left) {
        const rightType = right.get(parameter);
        if (rightType != null) {
            solver.unify(leftType, rightType);
        }
    }
};
