import { Visit } from "../visitor";
import { Fact, Node } from "../../db";
import { BlockExpression } from "../../syntax";
import { visitStatement } from "../statements";
import { TypeConstraint, types } from "../../typecheck";
import * as codegen from "../../codegen";

export class IsBlockExpression extends Fact<null> {}
export class StatementInBlockExpression extends Fact<Node> {}

export const visitBlockExpression: Visit<BlockExpression> = (visitor, expression, node) => {
    visitor.pushScope();

    const statements = expression.statements.map((statement) =>
        visitor.visit(statement, StatementInBlockExpression, visitStatement),
    );

    visitor.popScope();

    visitor.db.add(node, new IsBlockExpression(null));
    visitor.addConstraints(
        new TypeConstraint(node, types.block(statements.at(-1) ?? types.unit())),
    );

    node.setCodegen(codegen.functionExpression([], statements));
};
