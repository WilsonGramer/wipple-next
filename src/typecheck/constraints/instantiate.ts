import { Constraint } from "./constraint";
import { Solver } from "../solve";
import { Node } from "../../db/node";
import { HasConstraints } from "../../visit/visitor";
import { Score } from ".";
import { Type } from "./type";

export interface Instantiation {
    source: Node | undefined;
    definition: Node;
    replacements: Map<Node, Node>;
    substitutions: Map<Node, Type>;
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
        _source: Node | undefined,
        _replacements: Map<Node, Node>,
        _substitutions: Map<Node, Type>,
    ): this | undefined {
        return undefined; // ignore nested instantiate constraints
    }

    run(solver: Solver) {
        const { source, definition, substitutions, replacements } = this.instantiation;

        // NOTE: Types are *not* applied before instantiating; we have access to
        // all related nodes/constraints here, which together will form better
        // groups
        const instantiatedConstraints: Constraint[] = [];
        for (const constraints of solver.db.list(definition, HasConstraints)) {
            instantiatedConstraints.push(
                ...constraints.flatMap((constraint) => {
                    const instantiated = constraint.instantiate(
                        source,
                        replacements,
                        substitutions,
                    );

                    return instantiated != null ? [instantiated] : [];
                }),
            );
        }

        solver.add(...instantiatedConstraints);
    }
}
