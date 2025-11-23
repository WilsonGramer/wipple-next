import { Node } from "../../node";
import type { Visitor } from "../../visit";

export class ConstraintNode extends Node {
    visit(_visitor: Visitor): void {}
}
