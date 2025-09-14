import { Score } from ".";
import { Node } from "../../db";
import { Solver } from "../solve";
import { Type } from "./type";

export abstract class Constraint {
    abstract score(): Score;
    referencedNodes?(): Node[];
    abstract instantiate(
        source: Node | undefined,
        replacements: Map<Node, Node>,
        substitutions: Map<Node, Type>,
    ): this | undefined;
    abstract run(solver: Solver): void;
}
