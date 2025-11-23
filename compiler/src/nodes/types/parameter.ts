import type { Visitor } from "../../visit";
import { TypeParameters } from "../../visit";
import type { Span } from "../../span";
import { TypeNode } from "./index";
import { TypeParameterDefinition } from "../../visit/definitions";
import { GroupConstraint } from "../../typecheck/constraints/group";
import { TypeConstraint } from "../../typecheck/constraints/type";
import { types } from "../../typecheck";

export class TypeParameterNode extends TypeNode {
    name: string;
    infer: boolean;
    value: TypeNode | undefined;

    constructor(name: string, infer: boolean, value: TypeNode | undefined, span: Span) {
        super(span);
        this.name = name;
        this.infer = infer;
        this.value = value;
    }

    *children() {
        if (this.value != null) {
            yield this.value;
        }
    }

    visit(visitor: Visitor): void {
        super.visit(visitor);

        const existingDefinition = visitor.resolve(this.name, [TypeParameterDefinition], this);
        if (existingDefinition != null) {
            visitor.constraint(new GroupConstraint(this, existingDefinition.node));
        } else if (visitor.currentDefinition?.implicitTypeParameters) {
            const definition = new TypeParameterDefinition(this);
            visitor.define(this.name, definition);

            visitor.constraint(new TypeConstraint(this, types.parameter(this)));

            // Update the `Resolved` fact
            visitor.resolve(this.name, [TypeParameterDefinition], this);

            if (this.value != null) {
                visitor.visit(this.value);

                visitor.constraint(new GroupConstraint(this, this.value).waitUntilInstantiated());
            }

            visitor.currentDefinition.node.facts.getOr(TypeParameters, []).push(this);
        }
    }
}
