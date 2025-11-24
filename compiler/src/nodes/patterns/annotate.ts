import type { Visitor } from "../../visit";
import type { Span } from "../../span";
import { PatternNode } from "./index";
import type { TypeNode } from "../types";
import { GroupConstraint } from "../../typecheck/constraints/group";
import type { Codegen } from "../../codegen";

export class AnnotatePatternNode extends PatternNode {
    pattern: PatternNode;
    type: TypeNode;

    constructor(pattern: PatternNode, type: TypeNode, span: Span) {
        super(span);
        this.pattern = pattern;
        this.type = type;
    }

    *children() {
        yield this.pattern;
        yield this.type;
    }

    visit(visitor: Visitor): void {
        super.visit(visitor);

        this.isHidden = true;

        visitor.visit(this.pattern);
        visitor.visit(this.type);
        visitor.constraint(new GroupConstraint(this.pattern, this.type));
        visitor.constraint(new GroupConstraint(this, this.pattern));
    }

    codegen(codegen: Codegen): void {
        codegen.write(this.pattern);
    }
}
