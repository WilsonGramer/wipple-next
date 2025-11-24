import type { Visitor } from "../../visit";
import type { Span } from "../../span";
import { ExpressionNode } from "./index";
import type { TypeNode } from "../types";
import type { Type } from "../../typecheck";
import { types } from "../../typecheck";
import { TraitDefinition } from "../../visit/definitions";
import { InternalNode, type Node } from "../../node";
import type { TypeParameterNode } from "../types/parameter";
import { InstantiateConstraint } from "../../typecheck/constraints/instantiate";
import { TypeConstraint } from "../../typecheck/constraints/type";
import { GroupConstraint } from "../../typecheck/constraints/group";
import { BoundConstraint } from "../../typecheck/constraints/bound";
import type { Codegen } from "../../codegen";
import { CallExpressionNode } from "./call";

export class AsExpressionNode extends ExpressionNode {
    left: ExpressionNode;
    right: TypeNode;

    private asFunction?: Node;

    constructor(left: ExpressionNode, right: TypeNode, span: Span) {
        super(span);
        this.left = left;
        this.right = right;
    }

    *children() {
        yield this.left;
        yield this.right;
    }

    visit(visitor: Visitor): void {
        super.visit(visitor);

        visitor.visit(this.left);
        visitor.visit(this.right);

        const asTrait = visitor.resolve("As", [TraitDefinition], this);
        if (asTrait == null) {
            return;
        }

        const asFunction = new InternalNode(this.span);
        visitor.db.register(asFunction);

        this.asFunction = asFunction;

        const substitutions = new Map<TypeParameterNode, Type>([
            [asTrait.parameters[0], this.left], // input
            [asTrait.parameters[1], this.right], // output
        ]);

        const replacements = new Map([[asTrait.node, asFunction]]);

        visitor.constraint(
            new InstantiateConstraint({
                source: asFunction,
                definition: asTrait.node,
                substitutions,
                replacements,
            }),
        );

        visitor.constraint(
            new BoundConstraint(asFunction, {
                source: asFunction,
                trait: asTrait.node,
                substitutions,
            }),
        );

        visitor.constraint(new TypeConstraint(asFunction, types.function([this.left], this.right)));

        visitor.constraint(new GroupConstraint(this, this.right));
    }

    codegen(codegen: Codegen): void {
        if (this.asFunction == null) {
            codegen.fail();
        }

        codegen.write(new CallExpressionNode(this.asFunction, [this.left], this.span));
    }
}
