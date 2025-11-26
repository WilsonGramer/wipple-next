import type { Codegen } from "../../codegen";
import { InternalNode, type Node } from "../../node";
import type { Span } from "../../span";
import { GroupConstraint } from "../../typecheck/constraints/group";
import type { Visitor } from "../../visit";
import { CallExpressionNode } from "./call";
import { ConstructorExpressionNode } from "./constructor";
import { ExpressionNode } from "./index";

export class CollectionExpressionNode extends ExpressionNode {
    elements: ExpressionNode[];

    private collectionNode?: Node;

    constructor(elements: ExpressionNode[], span: Span) {
        super(span);
        this.elements = elements;
    }

    *children(): Generator<Node> {
        yield* this.elements;
    }

    visit(visitor: Visitor): void {
        super.visit(visitor);

        const elementType = new InternalNode(this.span);
        visitor.db.register(elementType);
        if (this.elements.length > 0) {
            visitor.constraint(new GroupConstraint(this.elements[0], elementType));
        }

        this.collectionNode = this.elements.reduce(
            (collection, element) =>
                new CallExpressionNode(
                    new ConstructorExpressionNode("Build-Collection", element.span),
                    [element, collection],
                    element.span,
                ),
            new ConstructorExpressionNode("Initial-Collection", this.span),
        );
        visitor.visit(this.collectionNode);
        visitor.constraint(new GroupConstraint(this.collectionNode, this));
    }

    codegen(codegen: Codegen): void {
        if (this.collectionNode == null) {
            codegen.fail();
        }

        codegen.write(this.span, this.collectionNode);
    }
}
