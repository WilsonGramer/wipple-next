import type { Visitor } from "../../visit";
import { TypeNode } from "./index";
import { TypeConstraint } from "../../typecheck/constraints/type";
import { types } from "../../typecheck";

export class UnitTypeNode extends TypeNode {
    visit(visitor: Visitor): void {
        super.visit(visitor);

        visitor.constraint(new TypeConstraint(this, types.tuple([])));
    }
}
