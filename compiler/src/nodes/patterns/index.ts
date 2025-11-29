import type { Codegen } from "../../codegen";
import { Node, type InternalNode } from "../../node";
import type { Span } from "../../span";
import { GroupConstraint } from "../../typecheck/constraints/group";
import { Group } from "../../typecheck/solve";
import type { Visitor } from "../../visit";
import { Typed } from "../types";
import type { VariablePatternNode } from "./variable";

export abstract class PatternNode extends Node {
    matching!: Node;

    visit(visitor: Visitor): void {
        this.facts.set(Typed, Group.empty(this));
        this.matching = visitor.currentMatch.node;

        visitor.constraint(new GroupConstraint(this, this.matching));
    }

    abstract temporaries(): Generator<InternalNode | VariablePatternNode>;
}

export class InternalPatternNode extends PatternNode {
    constructor(span: Span) {
        super(span);
    }

    *children(): Generator<Node> {}

    codegen(_codegen: Codegen): void {
        // No code needed
    }

    *temporaries() {}
}
