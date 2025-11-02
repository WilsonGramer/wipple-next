import { Visit } from "../visitor";
import { Fact, Node } from "../../db";
import { ExpressionStatement } from "../../syntax";
import { visitExpression } from "../expressions";
import * as codegen from "../../codegen";
import { trySetTopLevelExecutableStatement } from ".";
import { TypeConstraint } from "../../typecheck";

export class ExpressionInExpressionStatement extends Fact<Node> {}

export const visitExpressionStatement: Visit<ExpressionStatement> = (visitor, statement, node) => {
    const expression = visitor.visit(
        statement.expression,
        ExpressionInExpressionStatement,
        visitExpression,
    );

    visitor.addConstraints(new TypeConstraint(node, expression));

    node.setCodegen(codegen.expressionStatement(expression));

    trySetTopLevelExecutableStatement(visitor, node);
};
