import type { Visitor } from "../../visit";
import type { Span } from "../../span";
import { ConstraintNode } from "./index";
import type { TypeNode } from "../types";
import { DefaultConstraint } from "../../typecheck/constraints/default";
import type { Node } from "../../node";

export class DefaultConstraintNode extends ConstraintNode {
    parameter: TypeNode;
    value: TypeNode;

    constructor(parameter: TypeNode, value: TypeNode, span: Span) {
        super(span);
        this.parameter = parameter;
        this.value = value;
    }

    *children(): Generator<Node> {
        yield this.parameter;
        yield this.value;
    }

    visit(visitor: Visitor): void {
        super.visit(visitor);

        visitor.visit(this.parameter);
        visitor.visit(this.value);
        visitor.constraint(new DefaultConstraint(this.parameter, this.value));
    }
}
