import type { Node } from "../../node";
import { types } from "../../typecheck";
import { TypeConstraint } from "../../typecheck/constraints/type";
import type { Visitor } from "../../visit";
import { TypeNode } from "./index";

export class UnitTypeNode extends TypeNode {
    *children(): Generator<Node> {}

    visit(visitor: Visitor): void {
        super.visit(visitor);

        visitor.constraint(new TypeConstraint(this, types.tuple([])));
    }
}
