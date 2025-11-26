import type { Codegen } from "../../codegen";
import { InternalNode, type Node } from "../../node";
import type { Span } from "../../span";
import { GroupConstraint } from "../../typecheck/constraints/group";
import type { Visitor } from "../../visit";
import { TypeDefinition, VariantConstructorDefinition } from "../../visit/definitions";
import type { PatternNode } from "../patterns";
import { WildcardPatternNode } from "../patterns/wildcard";
import { ExpressionNode } from "./index";
import { Arm, WhenExpressionNode } from "./when";

export class IsExpressionNode extends ExpressionNode {
    left: ExpressionNode;
    right: PatternNode;

    private inputTemporary?: InternalNode;
    private trueVariant?: Node;
    private falseVariant?: Node;

    constructor(left: ExpressionNode, right: PatternNode, span: Span) {
        super(span);
        this.left = left;
        this.right = right;
    }

    *children(): Generator<Node> {
        yield this.left;
        yield this.right;
    }

    visit(visitor: Visitor): void {
        super.visit(visitor);

        visitor.visit(this.left);

        this.inputTemporary = new InternalNode(this.left.span);
        visitor.matching(this.inputTemporary, () => {
            visitor.visit(this.right);
        });

        visitor.constraint(new GroupConstraint(this.inputTemporary, this.left));

        const booleanTypeDefinition = visitor.resolve("Boolean", [TypeDefinition], this);
        const trueVariant = visitor.resolve("True", [VariantConstructorDefinition], this);
        const falseVariant = visitor.resolve("False", [VariantConstructorDefinition], this);
        if (booleanTypeDefinition == null || trueVariant == null || falseVariant == null) {
            return;
        }

        this.trueVariant = trueVariant.node;
        this.falseVariant = falseVariant.node;

        visitor.constraint(new GroupConstraint(this, booleanTypeDefinition.node));
    }

    codegen(codegen: Codegen): void {
        if (this.inputTemporary == null || this.trueVariant == null || this.falseVariant == null) {
            codegen.fail();
        }

        const whenExpression = new WhenExpressionNode(
            this.left,
            [
                new Arm(this.right, this.trueVariant, this.span),
                new Arm(new WildcardPatternNode(this.span), this.falseVariant, this.span),
            ],
            this.span,
        );

        whenExpression.inputTemporary = this.inputTemporary;

        codegen.write(this.span, whenExpression);
    }
}
