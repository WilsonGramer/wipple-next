import { Codegen } from ".";
import { Node } from "../db";

export const ifStatement =
    (conditions: Node[], statements: Node[], isElse: boolean) => (codegen: Codegen) => {
        throw new Error("TODO");
    };

export const expressionStatement = (expression: Node) => (codegen: Codegen) => {
    throw new Error("TODO");
};

export const returnStatement = (expression: Node) => (codegen: Codegen) => {
    throw new Error("TODO");
};
