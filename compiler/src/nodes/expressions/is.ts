import type { Visitor } from "../../visit";
import type { Span } from "../../span";
import { TypeDefinition, VariantConstructorDefinition } from "../../visit/definitions";
import { TypeConstraint } from "../../typecheck/constraints/type";
import { types } from "../../typecheck";
import type { PatternNode } from "../patterns";
import { ExpressionNode } from "./index";

export class IsExpressionNode extends ExpressionNode {
    left: ExpressionNode;
    right: PatternNode;

    constructor(left: ExpressionNode, right: PatternNode, span: Span) {
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

        visitor.visit(this.left);

        visitor.matching(this.left, () => {
            visitor.visit(this.right);
        });

        const booleanTypeDefinition = visitor.resolve("Boolean", [TypeDefinition], this);
        const trueVariant = visitor.resolve("True", [VariantConstructorDefinition], this);
        const falseVariant = visitor.resolve("False", [VariantConstructorDefinition], this);
        if (booleanTypeDefinition == null || trueVariant == null || falseVariant == null) {
            return;
        }

        visitor.constraint(new TypeConstraint(this, types.named(booleanTypeDefinition.node, [])));
    }
}
