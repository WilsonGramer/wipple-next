import type { Visitor } from "../../visit";
import type { Span } from "../../span";
import { ExpressionNode } from "./index";
import { StructureConstructorDefinition } from "../../visit/definitions";
import type { Node } from "../../node";
import { InstantiateConstraint } from "../../typecheck/constraints/instantiate";

export class StructureExpressionNode extends ExpressionNode {
    name: string;
    fields: StructureExpressionField[];

    constructor(name: string, fields: StructureExpressionField[], span: Span) {
        super(span);
        this.name = name;
        this.fields = fields;
    }

    *children() {
        for (const field of this.fields) {
            yield field.value;
        }
    }

    visit(visitor: Visitor): void {
        super.visit(visitor);

        const fields = new Map<string, Node>();
        for (const field of this.fields) {
            visitor.visit(field.value);
            fields.set(field.name, field.value);
        }

        const structureConstructorDefinition = visitor.resolve(
            this.name,
            [StructureConstructorDefinition],
            this,
        );

        if (structureConstructorDefinition == null) {
            return;
        }

        const replacements = new Map<Node, Node>([[structureConstructorDefinition.node, this]]);
        for (const [name, type] of Object.entries(structureConstructorDefinition.fields)) {
            const value = fields.get(name);

            if (value != null) {
                replacements.set(type, value);
            } else {
                // TODO: Handle missing field
            }
        }

        visitor.constraint(
            new InstantiateConstraint({
                source: this,
                definition: structureConstructorDefinition.node,
                substitutions: new Map(),
                replacements,
            }),
        );
    }
}

export class StructureExpressionField {
    span: Span;
    name: string;
    value: ExpressionNode;

    constructor(name: string, value: ExpressionNode, span: Span) {
        this.span = span;
        this.name = name;
        this.value = value;
    }
}
