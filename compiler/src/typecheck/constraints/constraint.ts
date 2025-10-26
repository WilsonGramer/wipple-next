import { Score } from ".";
import { Node } from "../../db";
import { Solver } from "../solve";
import { Type, TypeParameter } from "./type";

/**
 * Constraints are produced during the `visit` stage and add type information to
 * the program.
 */
export abstract class Constraint {
    /**
     * Used to order constraints (see `scores` below). For example, `group`
     * constraints have a higher score than `type` constraints so that groups
     * are formed before concrete types are applied; similarly, `bound`
     * constraints have a lower score than `type` constraints so that bound
     * resolution has access to concrete type information.
     */
    abstract score(): Score;

    /**
     * Produce a deep copy of this constraint, ignoring type parameters. This is
     * used when resolving generic constants and bounds, so the "concrete" type
     * parameter can be substituted with a real type from the use site. Without
     * this, the typechecker would try to unify type parameters with other
     * concrete types, causing errors.
     */
    abstract instantiate(
        source: Node,
        replacements: Map<Node, Node>,
        substitutions: Map<TypeParameter, Type>,
    ): this | undefined;

    /**
     * Add the type information in this constraint to the solver.
     */
    abstract run(solver: Solver): void;
}
