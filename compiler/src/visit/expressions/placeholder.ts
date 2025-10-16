import { Visit } from "../visitor";
import { Fact } from "../../db";
import { PlaceholderExpression } from "../../syntax";

export class IsPlaceholderExpression extends Fact<null> {}

export const visitPlaceholderExpression: Visit<PlaceholderExpression> = (
    visitor,
    _expression,
    node,
) => {
    visitor.db.add(node, new IsPlaceholderExpression(null));
};
