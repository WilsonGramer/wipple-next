import { Node } from "../../node";
import { GroupConstraint } from "../../typecheck/constraints/group";
import { Group } from "../../typecheck/solve";
import type { Visitor } from "../../visit";
import { Typed } from "../types";

export abstract class PatternNode extends Node {
    visit(visitor: Visitor): void {
        this.facts.set(Typed, Group.empty(this));

        visitor.constraint(new GroupConstraint(this, visitor.currentMatch));
    }
}
