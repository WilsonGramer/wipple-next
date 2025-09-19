import { Codegen } from ".";
import { Node } from "../db";

export const assignCondition = (matching: Node, variable: Node) => (codegen: Codegen) => {
    throw new Error("TODO");
};

export const elementCondition =
    (matching: Node, element: Node, index: number) => (codegen: Codegen) => {
        throw new Error("TODO");
    };

export const isVariantCondition = (matching: Node, variantIndex: number) => (codegen: Codegen) => {
    throw new Error("TODO");
};

export const isNumberCondition = (matching: Node, value: string) => (codegen: Codegen) => {
    throw new Error("TODO");
};

export const isStringCondition = (matching: Node, value: string) => (codegen: Codegen) => {
    throw new Error("TODO");
};

export const orCondition = (left: Node[], right: Node[]) => (codegen: Codegen) => {
    throw new Error("TODO");
};
