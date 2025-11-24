import type { Visitor } from "../../visit";
import type { Span } from "../../span";
import { TypeConstraint } from "../../typecheck/constraints/type";
import { GroupConstraint } from "../../typecheck/constraints/group";
import { InstantiateConstraint } from "../../typecheck/constraints/instantiate";
import { types } from "../../typecheck";
import { ExpressionNode } from "./index";
import { TraitDefinition } from "../../visit/definitions";
import { InternalNode, type Node } from "../../node";
import { BoundConstraint } from "../../typecheck/constraints/bound";
import type { Codegen } from "../../codegen";
import { CallExpressionNode } from "./call";

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

        const initialCollectionNode = new InternalNode(this.span);
        visitor.db.register(initialCollectionNode);

        const initialSubstitutions = new Map();

        visitor.constraint(
            new InstantiateConstraint({
                source: initialCollectionNode,
                definition: initialCollectionDefinition.node,
                substitutions: initialSubstitutions,
                replacements: new Map([[initialCollectionDefinition.node, initialCollectionNode]]),
            }),
        );

        visitor.constraint(
            new BoundConstraint(initialCollectionNode, {
                source: initialCollectionNode,
                trait: initialCollectionDefinition.node,
                substitutions: initialSubstitutions,
            }),
        );

        const buildCollectionNode =
            buildCollectionDefinition != null ? new InternalNode(this.span) : undefined;

        if (buildCollectionDefinition != null && buildCollectionNode != null) {
            const buildSubstitutions = new Map();

            visitor.constraint(
                new InstantiateConstraint({
                    source: buildCollectionNode,
                    definition: buildCollectionDefinition.node,
                    substitutions: buildSubstitutions,
                    replacements: new Map([[buildCollectionDefinition.node, buildCollectionNode]]),
                }),
            );

            visitor.constraint(
                new BoundConstraint(buildCollectionNode, {
                    source: buildCollectionNode,
                    trait: buildCollectionDefinition.node,
                    substitutions: buildSubstitutions,
                }),
            );
        }

        if (
            initialCollectionNode == null ||
            (this.elements.length > 0 && buildCollectionNode == null)
        ) {
            return;
        }

        const resultNode = this.elements.reduce((collection, element) => {
            const next = new InternalNode(this.span);
            visitor.db.register(next);

            visitor.constraint(
                new TypeConstraint(
                    buildCollectionNode!,
                    types.function([element, collection], next),
                ),
            );

            return next;
        }, initialCollectionNode);

        visitor.constraint(new GroupConstraint(this, resultNode));
    }

    codegen(codegen: Codegen): void {
        if (this.initialCollectionNode == null || this.buildCollectionNode == null) {
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
    }
}
