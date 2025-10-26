import { Solver } from "../solve";
import { Node } from "../../db/node";
import { HasConstraints } from "../../visit/visitor";
import { getOrInstantiate, Score } from ".";
import { instantiateType, Type, TypeParameter } from "./type";
import { Constraint } from "./constraint";

export interface Instantiation {
    sources: (Node | undefined)[];
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
        sources: (Node | undefined)[],
        _definition: Node,
        _replacements: Map<Node, Node>,
        substitutions: Map<TypeParameter, Type>,
    ): this | undefined {
        const instantiation: Instantiation = {
            sources: this.instantiation.sources,
            definition: this.instantiation.definition,
            replacements: this.instantiation.replacements,
            substitutions: new Map(
                this.instantiation.substitutions
                    .entries()
                    .map(([parameter, substitution]) => [
                        parameter,
                        instantiateType(
                            substitution,
                            sources.find((source) => source != null)!,
                            this.instantiation.replacements,
                            substitutions,
                        ),
                    ]),
            ),
        };

        return new InstantiateConstraint(instantiation) as this;
    }

    run(solver: Solver) {
        const { sources, definition, substitutions, replacements } = this.instantiation;

        // NOTE: Types are *not* applied before instantiating; we have access to
        // all related nodes/constraints here, which together will form better
        // groups
        const instantiatedConstraints: Constraint[] = [];
        for (const constraints of solver.db.list(definition, HasConstraints)) {
            instantiatedConstraints.push(
                ...constraints.flatMap((constraint) => {
                    const instantiated = constraint.instantiate(
                        sources,
                        definition,
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
