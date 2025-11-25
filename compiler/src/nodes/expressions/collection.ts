import type { Visitor } from "../../visit";
import type { Span } from "../../span";
import { TypeConstraint } from "../../typecheck/constraints/type";
import { GroupConstraint } from "../../typecheck/constraints/group";
import { InstantiateConstraint } from "../../typecheck/constraints/instantiate";
import { types, type Type } from "../../typecheck";
import { ExpressionNode } from "./index";
import { TraitDefinition, TypeDefinition } from "../../visit/definitions";
import { InternalNode, type Node } from "../../node";
import { BoundConstraint } from "../../typecheck/constraints/bound";
import type { Codegen } from "../../codegen";
import { CallExpressionNode } from "./call";
import { ConstructorExpressionNode } from "./constructor";
import type { TypeParameterNode } from "../types/parameter";
import { DefaultConstraint } from "../../typecheck/constraints/default";
import { NamedTypeNode } from "../types/named";

export class CollectionExpressionNode extends ExpressionNode {
    elements: ExpressionNode[];

    private collectionNode?: Node;

    constructor(elements: ExpressionNode[], span: Span) {
        super(span);
        this.elements = elements;
    }

    *children() {
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
