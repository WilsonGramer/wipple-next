import type { Codegen } from "../../codegen";
import { type Node } from "../../node";
import type { Span } from "../../span";
import { types } from "../../typecheck";
import { GroupConstraint } from "../../typecheck/constraints/group";
import { TypeConstraint } from "../../typecheck/constraints/type";
import type { Visitor } from "../../visit";
import type { TypeNode } from "../types";
import { CallExpressionNode } from "./call";
import { ConstructorExpressionNode } from "./constructor";
import { ExpressionNode } from "./index";

export class AsExpressionNode extends ExpressionNode {
    left: ExpressionNode;
    right: TypeNode;

    private asFunction?: Node;

    constructor(left: ExpressionNode, right: TypeNode, span: Span) {
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
        visitor.visit(this.right);

        this.asFunction = new ConstructorExpressionNode("As", this.span);
        visitor.visit(this.asFunction);
        visitor.constraint(
            new TypeConstraint(this.asFunction, types.function([this.left], this.right)),
        );

        visitor.constraint(new GroupConstraint(this, this.right));
    }

    codegen(codegen: Codegen): void {
        if (this.asFunction == null) {
            codegen.fail();
        }

        codegen.write(this.span, new CallExpressionNode(this.asFunction, [this.left], this.span));
    }
}
