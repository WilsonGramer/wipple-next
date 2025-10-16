import { Visit } from "../visitor";
import { Fact, Node } from "../../db";
import { ExpressionStatement } from "../../syntax";
import { visitExpression } from "../expressions";
import * as codegen from "../../codegen";

export class ExpressionInExpressionStatement extends Fact<Node> {}

export const visitExpressionStatement: Visit<ExpressionStatement> = (visitor, statement, node) => {
    visitor.enqueue("afterAllDefinitions", () => {
        const expression = visitor.visit(
            statement.expression,
            ExpressionInExpressionStatement,
            visitExpression,
        );

        node.setCodegen(codegen.expressionStatement(expression));
    });
};
