import type { Visitor } from "../../visit";
import type { Span } from "../../span";
import { PatternNode } from "./index";
import { StructureConstructorDefinition } from "../../visit/definitions";
import { InternalNode, type Node } from "../../node";
import { InstantiateConstraint } from "../../typecheck/constraints/instantiate";

export class StructurePatternNode extends PatternNode {
    name: string;
    fields: StructurePatternField[];

    constructor(name: string, fields: StructurePatternField[], span: Span) {
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

        const definition = visitor.resolve(this.name, [StructureConstructorDefinition], this);
        const fields = new Map<string, Node>();
        for (const field of this.fields) {
            const fieldNode = new InternalNode(field.span);
            visitor.db.register(fieldNode);

            visitor.matching(fieldNode, () => {
                visitor.visit(field.value);
            });

            fields.set(field.name, fieldNode);
        }

        if (definition == null) {
            return;
        }

        const replacements = new Map<Node, Node>([[definition.node, this]]);
        for (const [name, type] of Object.entries(definition.fields)) {
            const value = fields.get(name);
            if (value != null) {
                replacements.set(type, value);
            }
        }

        visitor.constraint(
            new InstantiateConstraint({
                source: this,
                definition: definition.node,
                substitutions: new Map(),
                replacements,
            }),
        );
    }
}

export class StructurePatternField {
    span: Span;
    name: string;
    value: PatternNode;

    constructor(name: string, value: PatternNode, span: Span) {
        this.span = span;
        this.name = name;
        this.value = value;
    }
}
