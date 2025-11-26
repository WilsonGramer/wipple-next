import type { Codegen } from "../../codegen";
import { type InternalNode, type Node } from "../../node";
import type { Span } from "../../span";
import { InstantiateConstraint } from "../../typecheck/constraints/instantiate";
import type { Visitor } from "../../visit";
import { StructureConstructorDefinition } from "../../visit/definitions";
import { PatternNode } from "./index";

export class StructurePatternNode extends PatternNode {
    name: string;
    fields: StructurePatternField[];

    private fieldTemporaries?: Map<string, readonly [InternalNode, PatternNode]>;

    constructor(name: string, fields: StructurePatternField[], span: Span) {
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

        const definition = visitor.resolve(this.name, [StructureConstructorDefinition], this);
        const fields = new Map(
            this.fields.map((field) => [
                field.name,
                [visitor.subpattern(field.value), field.value] as const,
            ]),
        );

        if (definition == null) {
            return;
        }

        this.fieldTemporaries = fields;

        const replacements = new Map<Node, Node>([[definition.node, this]]);
        for (const [name, type] of definition.fields) {
            const value = fields.get(name);
            if (value != null) {
                replacements.set(type, value[0]);
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

    codegen(codegen: Codegen): void {
        if (this.fieldTemporaries == null) {
            codegen.fail();
        }

        for (const [name, [temporary, pattern]] of this.fieldTemporaries) {
            codegen.write(
                this.span,
                ` && ((`,
                codegen.node(temporary),
                ` = `,
                codegen.node(this.matching),
                `[${JSON.stringify(name)}]) || true)`,
                pattern,
            );
        }
    }

    *temporaries() {
        if (this.fieldTemporaries != null) {
            for (const [temporary, pattern] of this.fieldTemporaries.values()) {
                yield temporary;
                yield* pattern.temporaries();
            }
        }
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
