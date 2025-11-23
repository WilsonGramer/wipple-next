import type { Visitor } from "../../visit";
import type { Span } from "../../span";
import { PatternNode } from "./index";
import type { TypeNode } from "../types";
import { GroupConstraint } from "../../typecheck/constraints/group";

export class AnnotatePatternNode extends PatternNode {
    left: PatternNode;
    right: TypeNode;

    constructor(left: PatternNode, right: TypeNode, span: Span) {
        super(span);
        this.left = left;
        this.right = right;
    }

    *children() {
        yield this.left;
        yield this.right;
    }

    visit(visitor: Visitor): void {
        super.visit(visitor);

        this.isHidden = true;

        visitor.visit(this.left);
        visitor.visit(this.right);
        visitor.constraint(new GroupConstraint(this.left, this.right));
        visitor.constraint(new GroupConstraint(this, this.left));
    }
}
