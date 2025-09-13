import { Visit } from "../visitor";
import { Fact, Node } from "../../db";
import { BlockType } from "../../syntax";
import { TypeConstraint, types } from "../../typecheck";
import { visitType } from ".";

export class IsBlockType extends Fact<null> {}
export class OutputInBlockType extends Fact<Node> {}

export const visitBlockType: Visit<BlockType> = (visitor, expression, node) => {
    const output = visitor.visit(expression.output, OutputInBlockType, visitType);

    visitor.db.add(node, new IsBlockType(null));
    visitor.addConstraints(new TypeConstraint(node, types.block(output)));
};
