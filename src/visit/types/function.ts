import { Visit } from "../visitor";
import { Fact, Node } from "../../db";
import { FunctionType } from "../../syntax";
import { visitType } from ".";
import { TypeConstraint, types } from "../../typecheck";

export class IsFunctionType extends Fact<null> {}
export class InputInFunctionType extends Fact<Node> {}
export class OutputInFunctionType extends Fact<Node> {}

export const visitFunctionType: Visit<FunctionType> = (visitor, expression, node) => {
    const inputs = expression.inputs.map((input) =>
        visitor.visit(input, InputInFunctionType, visitType),
    );

    const output = visitor.visit(expression.output, OutputInFunctionType, visitType);

    visitor.db.add(node, new IsFunctionType(null));
    visitor.addConstraints(new TypeConstraint(node, types.function(inputs, output)));
};
