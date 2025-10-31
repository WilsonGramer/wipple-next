import { Solver } from "../solve";
import { Node } from "../../db/node";
import { HasDefinitionConstraints } from "../../visit/visitor";
import { getOrInstantiate, Score } from ".";
import { instantiateType, Type, TypeParameter } from "./type";
import { Constraint } from "./constraint";

export interface Instantiation {
    source: Node;
    definition: Node;
    replacements: Map<Node, Node>;
    substitutions: Map<TypeParameter, Type>;
}

export class InstantiateConstraint extends Constraint {
    instantiation: Instantiation;

    constructor(instantiation: Instantiation) {
        super();
        this.instantiation = instantiation;
    }

    score(): Score {
        return "instantiate";
    }

    instantiate(
        _solver: Solver,
        source: Node,
        replacements: Map<Node, Node>,
        substitutions: Map<TypeParameter, Type>,
    ): this | void {
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

        return new InstantiateConstraint(instantiation) as this;
    }

    run(solver: Solver): this | void {
        const { source, definition, substitutions, replacements } = this.instantiation;

        // NOTE: Types are *not* applied before instantiating; we have access to
        // all related nodes/constraints here, which together will form better
        // groups
        const instantiatedConstraints: Constraint[] = [];
        for (const constraints of solver.db.list(definition, HasDefinitionConstraints)) {
            instantiatedConstraints.push(
                ...constraints.flatMap((constraint) => {
                    const instantiated = constraint.instantiate(
                        solver,
                        source,
                        replacements,
                        substitutions,
                    );

                    return instantiated != null ? [instantiated] : [];
                }),
            );
        }

        solver.add(...instantiatedConstraints);
        solver.applyQueue.push(substitutions);
    }
}
