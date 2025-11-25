import type { Visitor } from "../../visit";
import type { Span } from "../../span";
import { PatternNode } from "./index";
import { GroupConstraint } from "../../typecheck/constraints/group";
import type { Codegen } from "../../codegen";

export class OrPatternNode extends PatternNode {
    patterns: PatternNode[];

    constructor(patterns: PatternNode[], span: Span) {
        super(span);
        this.patterns = patterns;
    }

    *children() {
        yield* this.patterns;
    }

    visit(visitor: Visitor): void {
        super.visit(visitor);

        for (const pattern of this.patterns) {
            visitor.visit(pattern);
        }

        for (const pattern of this.patterns) {
            visitor.constraint(new GroupConstraint(this, pattern));
        }
    }

    codegen(codegen: Codegen): void {
        codegen.write(this.span, " && (false");

        for (const pattern of this.patterns) {
            codegen.write(this.span, " || (true", pattern, ")");
        }

        codegen.write(this.span, ")");
    }

    *temporaries() {
        for (const pattern of this.patterns) {
            yield* pattern.temporaries();
        }
    }
}
