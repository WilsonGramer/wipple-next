import type { Type } from "..";
import { getOrInstantiate, instantiateType } from "..";
import type { Node } from "../../node";
import type { TypeParameterNode } from "../../nodes/types/parameter";
import { DefinitionConstraints } from "../../visit";
import type { Solver } from "../solve";
import { Constraint } from "./constraint";

export interface Instantiation {
    source: Node;
    definition: Node;
    replacements: Map<Node, Node>;
    substitutions: Map<TypeParameterNode, Type>;
}

export class InstantiateConstraint extends Constraint {
    instantiation: Instantiation;

    constructor(instantiation: Instantiation) {
        super();
        this.instantiation = instantiation;
    }

    instantiate(
        _solver: Solver,
        source: Node,
        replacements: Map<Node, Node>,
        substitutions: Map<TypeParameterNode, Type>,
    ): Constraint {
        const instantiation: Instantiation = {
            source,
            definition: this.instantiation.definition,
            replacements: new Map(
                this.instantiation.replacements
                    .entries()
                    .map(([node, replacement]) => [
                        node,
                        getOrInstantiate(replacement, source, replacements),
                    ]),
            ),
            substitutions: new Map(
                this.instantiation.substitutions
                    .entries()
                    .map(([parameter, substitution]) => [
                        parameter,
                        instantiateType(substitution, source, replacements, substitutions),
                    ]),
            ),
        };

        return new InstantiateConstraint(instantiation);
    }

    run(solver: Solver): boolean {
        const { source, definition, substitutions, replacements } = this.instantiation;

        // NOTE: Types are *not* applied before instantiating; we have access to
        // all related nodes/constraints here, which together will form better
        // groups
        const instantiatedConstraints =
            definition.facts.get(DefinitionConstraints)?.flatMap((constraint) => {
                if (!constraint.shouldInstantiate) {
                    return [];
                }

                return constraint.instantiate(solver, source, replacements, substitutions);
            }) ?? [];

        solver.add(...instantiatedConstraints);

        return true;
    }
}
