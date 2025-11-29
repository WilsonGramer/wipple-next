import type { Codegen } from "../../codegen";
import { Fact } from "../../db";
import { type Node } from "../../node";
import type { Span } from "../../span";
import { InstantiateConstraint } from "../../typecheck/constraints/instantiate";
import { zipNodeMaps } from "../../util/zip";
import type { Visitor } from "../../visit";
import { StructureConstructorDefinition } from "../../visit/definitions";
import { ExpressionNode } from "./index";

export class MissingField extends Fact<null> {
    display(): string {
        return "is missing field";
    }
}

export class ExtraField extends Fact<null> {
    display(): string {
        return "is extra field";
    }
}

export class DuplicateField extends Fact<null> {
    display(): string {
        return "is duplicate field";
    }
}

export class StructureExpressionNode extends ExpressionNode {
    name: string;
    fields: StructureExpressionField[];

    constructor(name: string, fields: StructureExpressionField[], span: Span) {
        super(span);
        this.name = name;
        this.fields = fields;
    }

    *children(): Generator<Node> {
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

        const fieldValues = zipNodeMaps(
            structureConstructorDefinition.fields,
            Iterator.from(this.fields).map((field) => [field.name, field.value]),
            {
                missing: MissingField,
                extra: ExtraField,
                duplicate: DuplicateField,
            },
        );

        visitor.constraint(
            new InstantiateConstraint({
                source: this,
                definition: structureConstructorDefinition.node,
                substitutions: new Map(),
                replacements: new Map([
                    [structureConstructorDefinition.node, this],
                    ...fieldValues,
                ]),
            }),
        );
    }

    codegen(codegen: Codegen): void {
        codegen.write(this.span, "{");

        for (const field of this.fields) {
            codegen.write(this.span, `${JSON.stringify(field.name)}: `);
            codegen.write(this.span, field.value);
            codegen.write(this.span, ", ");
        }

        codegen.write(this.span, "}");
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
