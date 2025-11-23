import { Solver } from "../solve";
import type { Node } from "../../node";
import { fact } from "../../node";
import { Instances } from "../../visit";
import { Constraint } from "./constraint";
import type { TraitDefinitionNode } from "../../nodes/statements/trait-definition";
import { InstanceDefinitionNode } from "../../nodes/statements/instance-definition";
import type { TypeParameterNode } from "../../nodes/types/parameter";
import type { Type } from "..";
import { displayType, instantiateType } from "..";
import { InstantiateConstraint } from "./instantiate";

export interface Instance {
    node: Node;
    trait: TraitDefinitionNode;
    substitutions: Map<TypeParameterNode, Type>;
    default?: boolean;
    error?: boolean;
}

export interface UnresolvedBound {
    source: Node;
    trait: TraitDefinitionNode;
    substitutions: Map<TypeParameterNode, Type>;
}

export interface ResolvedBound extends UnresolvedBound {
    solver: Solver;
}

export const cloneBound = (bound: ResolvedBound) => ({
    ...bound,
    substitutions: new Map(bound.substitutions),
});

export const displayBound = (bound: ResolvedBound) => {
    // This forces the order of the parameters to match the trait definition
    const parameterTypes = bound.trait.parameters.map(
        (parameter) => bound.substitutions.get(parameter)!,
    );

    return `${bound.trait.name}${parameterTypes
        .map((type) => ` ${displayType(bound.solver.apply(type), false)}`)
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
    substitutions: Map<TypeParameterNode, Type>;
}

export const ResolvedBound = fact<
    {
        bound: ResolvedBound;
        instance: InstanceDefinitionNode | undefined;
    }[]
>(
    (bounds) =>
        `has bound(s) ${bounds
            .map(
                ({ bound, instance }) =>
                    `\`${displayBound(bound)}\` (${
                        instance != null ? instance.toString() : "unresolved"
                    })`,
            )
            .join(", ")}`,
);

export class BoundConstraint extends Constraint {
    node: Node;
    bound: UnresolvedBound;

    constructor(node: Node, bound: UnresolvedBound) {
        super();
        this.node = node;
        this.bound = bound;
    }

    instantiate(
        _solver: Solver,
        source: Node,
        replacements: Map<Node, Node>,
        substitutions: Map<TypeParameterNode, Type>,
    ): Constraint {
        const bound: UnresolvedBound = {
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
        };

        return new BoundConstraint(this.node, bound);
    }

    asInstance(): Instance {
        return {
            node: this.node,
            trait: this.bound.trait,
            substitutions: this.bound.substitutions,
        };
    }

    run(solver: Solver): void {
        const { source, trait, substitutions } = this.bound;

        // These are for the *trait's* parameters
        const boundSubstitutions = new Map<TypeParameterNode, Type>();
        const boundInferred = new Map<TypeParameterNode, Type>();
        for (const [parameter, type] of substitutions) {
            // NOTE: No need to instantiate `type` here; the bound has already
            // been instantiated
            if (parameter.infer) {
                boundInferred.set(parameter, type);
            } else {
                boundSubstitutions.set(parameter, type);
            }
        }

        const instances = trait.facts.get(Instances) ?? [];

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

            const candidates: [instanceNode: Node, copy: Solver][] = [];

            for (const instance of instances) {
                if (instance.trait !== trait) {
                    continue;
                }

                const copy = Solver.from(solver);
                copy.impliedInstances = [...solver.impliedInstances];

                // These are for the *instance's own* parameters, not the trait
                // parameters like with the bound
                const replacements = new Map<Node, Node>();
                const substitutions = new Map<TypeParameterNode, Type>();
                if (instantiate) {
                    copy.add(
                        new InstantiateConstraint({
                            source,
                            definition: instance.node,
                            replacements,
                            substitutions,
                        }),
                    );
                }

                // Run the solver (excluding bounds) to populate `replacements`
                copy.run({ until: BoundConstraint });

                // These are for the *trait's* parameters
                const instanceSubstitutions = new Map<TypeParameterNode, Type>();
                const instanceInferred = new Map<TypeParameterNode, Type>();
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

            const resolvedBound: ResolvedBound = {
                solver,
                source,
                trait,
                substitutions: new Map([...boundSubstitutions, ...boundInferred]),
            };

            // Allow multiple candidates (picking the first) if considering
            // implied instances
            const hasCandidate = instantiate ? candidates.length === 1 : candidates.length > 0;

            if (hasCandidate) {
                const [[instanceNode, copy]] = candidates;

                solver.inherit(copy);
                solver.add(...copy.constraints); // add the remaining bound constraints

                // Don't indicate a resolved instance if this instance is
                // implied (suppresses custom `[error]` messages)
                const isImpliedInstance = solver.impliedInstances.some(
                    (instance) => instance.node === instanceNode,
                );

                if (!isImpliedInstance && instanceNode instanceof InstanceDefinitionNode) {
                    source.facts.getOr(ResolvedBound, []).push({
                        bound: applyBound(resolvedBound, solver),
                        instance: instanceNode,
                    });

                    if (!solver.boundCache.has(source)) {
                        solver.boundCache.set(source, new Map());
                    }

                    solver.boundCache.get(source)!.set(this.node, instanceNode);
                }

                break;
            }

            if (isLastInstanceSet) {
                source.facts.getOr(ResolvedBound, []).push({
                    bound: applyBound(resolvedBound, solver),
                    instance: undefined,
                });
            }
        }
    }
}

const unifySubstitutions = (
    solver: Solver,
    left: Map<TypeParameterNode, Type>,
    right: Map<TypeParameterNode, Type>,
) => {
    for (const [parameter, leftType] of left) {
        const rightType = right.get(parameter);
        if (rightType != null) {
            solver.unify(leftType, rightType);
        }
    }
};
