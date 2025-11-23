import type { Visitor } from "../../visit";
import type { Span } from "../../span";
import { ConstraintNode } from "./index";
import type { TypeNode } from "../types";
import { TraitDefinition } from "../../visit/definitions";
import { BoundConstraint } from "../../typecheck/constraints/bound";

export class BoundConstraintNode extends ConstraintNode {
    trait: string;
    parameters: TypeNode[];

    constructor(trait: string, parameters: TypeNode[], span: Span) {
        super(span);
        this.trait = trait;
        this.parameters = parameters;
    }

    *children() {
        yield* this.parameters;
    }

    visit(visitor: Visitor): void {
        super.visit(visitor);

        const trait = visitor.resolve(this.trait, [TraitDefinition], this);
        if (trait == null) {
            return;
        }

        for (const parameter of this.parameters) {
            visitor.visit(parameter);
        }

        // TODO: Ensure `parameters` has the right length
        const substitutions = new Map(
            trait.parameters.map((parameter, index) => [parameter, this.parameters[index]]),
        );

        visitor.constraint(
            new BoundConstraint(this, {
                source: this,
                trait: trait.node,
                substitutions,
            }).waitUntilInstantiated(),
        );
    }
}
