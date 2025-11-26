import type { Visitor } from "../../visit";
import { TypeNode } from "./index";
import { TypeConstraint } from "../../typecheck/constraints/type";
import { types } from "../../typecheck";
import type { Node } from "../../node";

export class UnitTypeNode extends TypeNode {
    *children(): Generator<Node> {}

    visit(visitor: Visitor): void {
        super.visit(visitor);

        visitor.constraint(new TypeConstraint(this, types.tuple([])));
    }
}
