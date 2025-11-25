import type { Visitor } from "../../visit";
import type { Span } from "../../span";
import { TypeConstraint } from "../../typecheck/constraints/type";
import { GroupConstraint } from "../../typecheck/constraints/group";
import { InstantiateConstraint } from "../../typecheck/constraints/instantiate";
import { types, type Type } from "../../typecheck";
import { ExpressionNode } from "./index";
import { TraitDefinition } from "../../visit/definitions";
import { InternalNode, type Node } from "../../node";
import { BoundConstraint } from "../../typecheck/constraints/bound";
import type { Codegen } from "../../codegen";
import { CallExpressionNode } from "./call";
import { ConstructorExpressionNode } from "./constructor";
import type { TypeParameterNode } from "../types/parameter";

export class CollectionExpressionNode extends ExpressionNode {
    elements: ExpressionNode[];

    private initialCollectionNode?: Node;
    private buildCollectionNode?: Node;

    constructor(elements: ExpressionNode[], span: Span) {
        super(span);
        this.elements = elements;
    }

    *children() {
        yield* this.elements;
    }

    visit(visitor: Visitor): void {
        super.visit(visitor);

        for (const element of this.elements) {
            visitor.visit(element);
        }

        const initialCollectionDefinition = visitor.resolve(
            "Initial-Collection",
            [TraitDefinition],
            this,
        );
        const buildCollectionDefinition =
            this.elements.length > 0
                ? visitor.resolve("Build-Collection", [TraitDefinition], this)
                : undefined;
        if (
            initialCollectionDefinition == null ||
            (this.elements.length > 0 && buildCollectionDefinition == null)
        ) {
            return;
        }

        const initialSubstitutions = new Map<TypeParameterNode, Type>();

        this.initialCollectionNode = new InternalNode(this.span, (codegen) => {
            const constructor = new ConstructorExpressionNode(
                "Initial-Collection",
                initialCollectionDefinition.node.span,
            );

            constructor.matchingConstructorDefinition = initialCollectionDefinition;
            constructor.matchingSubstitutions = initialSubstitutions;

            codegen.write(constructor);
        });
        visitor.db.register(this.initialCollectionNode);

        visitor.constraint(
            new InstantiateConstraint({
                source: this.initialCollectionNode,
                definition: initialCollectionDefinition.node,
                substitutions: initialSubstitutions,
                replacements: new Map([
                    [initialCollectionDefinition.node, this.initialCollectionNode],
                ]),
            }),
        );

        visitor.constraint(
            new BoundConstraint(this.initialCollectionNode, {
                source: this.initialCollectionNode,
                trait: initialCollectionDefinition.node,
                substitutions: initialSubstitutions,
            }),
        );

        if (buildCollectionDefinition != null) {
            const buildSubstitutions = new Map<TypeParameterNode, Type>();

            this.buildCollectionNode = new InternalNode(this.span, (codegen) => {
                const constructor = new ConstructorExpressionNode(
                    "Build-Collection",
                    buildCollectionDefinition.node.span,
                );

                constructor.matchingConstructorDefinition = buildCollectionDefinition;
                constructor.matchingSubstitutions = buildSubstitutions;

                codegen.write(constructor);
            });

            visitor.constraint(
                new InstantiateConstraint({
                    source: this.buildCollectionNode,
                    definition: buildCollectionDefinition.node,
                    substitutions: buildSubstitutions,
                    replacements: new Map([
                        [buildCollectionDefinition.node, this.buildCollectionNode],
                    ]),
                }),
            );

            visitor.constraint(
                new BoundConstraint(this.buildCollectionNode, {
                    source: this.buildCollectionNode,
                    trait: buildCollectionDefinition.node,
                    substitutions: buildSubstitutions,
                }),
            );
        }

        if (
            this.initialCollectionNode == null ||
            (this.elements.length > 0 && this.buildCollectionNode == null)
        ) {
            return;
        }

        const resultNode = this.elements.reduce((collection, element) => {
            const next = new InternalNode(this.span);
            visitor.db.register(next);

            visitor.constraint(
                new TypeConstraint(
                    this.buildCollectionNode!,
                    types.function([element, collection], next),
                ),
            );

            return next;
        }, this.initialCollectionNode);

        visitor.constraint(new GroupConstraint(this, resultNode));
    }

    codegen(codegen: Codegen): void {
        if (this.initialCollectionNode == null) {
            codegen.fail();
        }

        if (this.elements.length > 0) {
            if (this.buildCollectionNode == null) {
                codegen.fail();
            }

            codegen.write(
                this.elements.reduce(
                    (collection, element) =>
                        new CallExpressionNode(
                            this.buildCollectionNode!,
                            [element, collection],
                            this.span,
                        ),
                    this.initialCollectionNode,
                ),
            );
        } else {
            codegen.write(this.initialCollectionNode);
        }
    }
}
