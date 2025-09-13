import { Visit } from "../visitor";
import { Fact, Node } from "../../db";
import { CallExpression } from "../../syntax";
import { visitExpression } from ".";
import { TypeConstraint, types } from "../../typecheck";

export class IsCallExpression extends Fact<null> {}
export class FunctionInCallExpression extends Fact<Node> {}
export class InputInCallExpression extends Fact<Node> {}

export class IsUnitExpression extends Fact<null> {}
export class InputInUnitExpression extends Fact<Node> {}
export class UnitInUnitExpression extends Fact<Node> {}

export const visitCallExpression: Visit<CallExpression> = (visitor, expression, node) => {
    if (expression.inputs.length === 1) {
        const [unit] = expression.inputs;

        if (unit.type === "variable") {
            const unitDefinition = visitor.peekName(unit.variable.value, (definition) =>
                definition.type === "constant" ? definition : undefined,
            );

            if (unitDefinition?.attributes.unit) {
                const unitNode = visitor.visit(unit, UnitInUnitExpression, visitExpression);
                const input = visitor.visit(
                    expression.function,
                    InputInUnitExpression,
                    visitExpression,
                );

                visitor.db.add(node, new IsUnitExpression(null));
                visitor.addConstraints(new TypeConstraint(unitNode, types.function([input], node)));

                return;
            }
        }
    }

    const func = visitor.visit(expression.function, FunctionInCallExpression, visitExpression);

    const inputs = expression.inputs.map((input) =>
        visitor.visit(input, InputInCallExpression, visitExpression),
    );

    visitor.db.add(node, new IsCallExpression(null));
    visitor.addConstraints(new TypeConstraint(func, types.function(inputs, node)));
};
