import type { Visitor } from "../../visit";
import type { Span } from "../../span";
import { TypeNode } from "./index";
import { TypeDefinition } from "../../visit/definitions";
import { InstantiateConstraint } from "../../typecheck/constraints/instantiate";
import { zipNodes } from "../../util";
import { ExtraType, MissingType } from ".";
import type { Node } from "../../node";

export class NamedTypeNode extends TypeNode {
    name: string;
    parameters: TypeNode[];

    constructor(name: string, parameters: TypeNode[], span: Span) {
        super(span);
        this.name = name;
        this.parameters = parameters;
    }

    *children(): Generator<Node> {
        yield* this.parameters;
    }

    visit(visitor: Visitor): void {
        super.visit(visitor);

        const typeDefinition = visitor.resolve(this.name, [TypeDefinition], this);

        for (const parameter of this.parameters) {
            visitor.visit(parameter);
        }

        if (typeDefinition != null) {
            const substitutions = new Map(
                zipNodes(typeDefinition.parameters, this.parameters, {
                    missing: MissingType,
                    extra: ExtraType,
                }),
            );

            visitor.constraint(
                new InstantiateConstraint({
                    source: this,
                    definition: typeDefinition.node,
                    substitutions,
                    replacements: new Map([[typeDefinition.node, this]]),
                }),
            );
        }
    }
}
