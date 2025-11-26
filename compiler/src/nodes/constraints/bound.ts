import type { Node } from "../../node";
import type { Span } from "../../span";
import { BoundConstraint } from "../../typecheck/constraints/bound";
import { zipNodes } from "../../util";
import type { Visitor } from "../../visit";
import { TraitDefinition } from "../../visit/definitions";
import type { TypeNode } from "../types";
import { ExtraType, MissingType } from "../types";
import { ConstraintNode } from "./index";

export class BoundConstraintNode extends ConstraintNode {
    trait: string;
    parameters: TypeNode[];

    constructor(trait: string, parameters: TypeNode[], span: Span) {
        super(span);
        this.trait = trait;
        this.parameters = parameters;
    }

    *children(): Generator<Node> {
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

        const substitutions = new Map(
            zipNodes(trait.parameters, this.parameters, {
                missing: MissingType,
                extra: ExtraType,
            }),
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
