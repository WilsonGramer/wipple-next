import { Visitor } from "../visitor";
import { IsTyped } from "..";
import { Fact, Node } from "../../db";
import { Expression } from "../../syntax";
import { visitNumberExpression } from "./number";
import { visitStringExpression } from "./string";
import { visitPlaceholderExpression } from "./placeholder";
import { visitAnnotateExpression } from "./annotate";
import { visitBlockExpression } from "./block";
import { visitUnitExpression } from "./unit";
import { visitVariableExpression } from "./variable";
import { visitCallExpression } from "./call";
import { visitFunctionExpression } from "./function";
import { visitDoExpression } from "./do";
import { visitTraitExpression } from "./trait";
import { visitAsExpression } from "./as";

export class IsExpression extends Fact<null> {}

export const visitExpression = (visitor: Visitor, expression: Expression, node: Node) => {
    visitor.db.add(node, new IsExpression(null));
    visitor.db.add(node, new IsTyped(null));

    switch (expression.type) {
        case "number":
            return visitNumberExpression(visitor, expression, node);
        case "function":
            return visitFunctionExpression(visitor, expression, node);
        case "tuple":
            throw new Error("TODO");
        case "collection":
            throw new Error("TODO");
        case "is":
            throw new Error("TODO");
        case "as":
            return visitAsExpression(visitor, expression, node);
        case "annotate":
            return visitAnnotateExpression(visitor, expression, node);
        case "binary":
            throw new Error("TODO");
        case "formattedString":
            throw new Error("TODO");
        case "call":
            return visitCallExpression(visitor, expression, node);
        case "do":
            return visitDoExpression(visitor, expression, node);
        case "when":
            throw new Error("TODO");
        case "intrinsic":
            throw new Error("TODO");
        case "placeholder":
            return visitPlaceholderExpression(visitor, expression, node);
        case "variable":
            return visitVariableExpression(visitor, expression, node);
        case "trait":
            return visitTraitExpression(visitor, expression, node);
        case "string":
            return visitStringExpression(visitor, expression, node);
        case "structure":
            throw new Error("TODO");
        case "block":
            return visitBlockExpression(visitor, expression, node);
        case "unit":
            return visitUnitExpression(visitor, expression, node);
        default:
            expression satisfies never;
    }
};
