import { Visitor } from "../visitor";
import { IsTyped } from "..";
import { Node } from "../../db";
import { Expression } from "../../syntax";
import { visitNumberExpression } from "./number";
import { visitTextExpression } from "./text";
import { visitPlaceholderExpression } from "./placeholder";
import { visitAnnotateExpression } from "./annotate";
import { visitBlockExpression } from "./block";
import { visitUnitExpression } from "./unit";
import { visitVariableExpression } from "./variable";
import { visitCallExpression } from "./call";
import { visitFunctionExpression } from "./function";

export const visitExpression = (visitor: Visitor, expression: Expression, node: Node) => {
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
            throw new Error("TODO");
        case "annotate":
            return visitAnnotateExpression(visitor, expression, node);
        case "binary":
            throw new Error("TODO");
        case "formattedText":
            throw new Error("TODO");
        case "call":
            return visitCallExpression(visitor, expression, node);
        case "do":
            throw new Error("TODO");
        case "when":
            throw new Error("TODO");
        case "intrinsic":
            throw new Error("TODO");
        case "placeholder":
            return visitPlaceholderExpression(visitor, expression, node);
        case "variable":
            return visitVariableExpression(visitor, expression, node);
        case "trait":
            throw new Error("TODO");
        case "text":
            return visitTextExpression(visitor, expression, node);
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
