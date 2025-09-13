import { Score } from ".";
import { Node } from "../../db";
import { Solver } from "../solve";
import { Type } from "./type";

export type Substitutions = Map<Node, Type>;

export abstract class Constraint {
    abstract score(): Score;
    referencedNodes?(): Node[];
    abstract instantiate(
        source: Node | undefined,
        replacements: Map<Node, Node>,
        substitutions: Substitutions,
    ): this | undefined;
    abstract run(solver: Solver): void;
}
