import { Node } from "../../node";
import type { Span } from "../../span";
import { GroupConstraint } from "../../typecheck/constraints/group";
import { Group } from "../../typecheck/solve";
import type { Visitor } from "../../visit";
import { Typed } from "../types";

export abstract class PatternNode extends Node {
    matching!: Node;

    visit(visitor: Visitor): void {
        this.facts.set(Typed, Group.empty(this));
        this.matching = visitor.currentMatch;

        visitor.constraint(new GroupConstraint(this, visitor.currentMatch));
    }
}

export class InternalPatternNode extends PatternNode {
    constructor(span: Span) {
        super(span);
    }
}
