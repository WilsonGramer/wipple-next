import { Node } from "../../node";
import { Group } from "../../typecheck/solve";
import type { Visitor } from "../../visit";
import { Typed } from "../types";

export class ExpressionNode extends Node {
    override visit(_visitor: Visitor): void {
        this.facts.set(Typed, Group.empty(this));
    }
}
