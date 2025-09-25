import { Visit } from "../visitor";
import { Fact, Node } from "../../db";
import { ExpressionStatement } from "../../syntax";
import { visitExpression } from "../expressions";

export class ExpressionInExpressionStatement extends Fact<Node> {}

export const visitExpressionStatement: Visit<ExpressionStatement> = (visitor, statement) => {
    visitor.enqueue("afterAllDefinitions", () => {
        visitor.visit(statement.expression, ExpressionInExpressionStatement, visitExpression);
    });
};
