import { CodegenItem } from ".";
import { Node } from "../db";

export const assignCondition = (matching: Node, variable: Node): CodegenItem => ({
    codegen: (codegen) => {
        throw new Error("TODO");
    },
});

export const elementCondition = (
    matching: Node,
    element: CodegenItem,
    index: number,
): CodegenItem => ({
    codegen: (codegen) => {
        throw new Error("TODO");
    },
});

export const isVariantCondition = (matching: Node, variantIndex: number): CodegenItem => ({
    codegen: (codegen) => {
        throw new Error("TODO");
    },
});

export const isNumberCondition = (matching: Node, value: string): CodegenItem => ({
    codegen: (codegen) => {
        throw new Error("TODO");
    },
});

export const isStringCondition = (matching: Node, value: string): CodegenItem => ({
    codegen: (codegen) => {
        throw new Error("TODO");
    },
});

export const orCondition = (left: CodegenItem[], right: CodegenItem[]): CodegenItem => ({
    codegen: (codegen) => {
        throw new Error("TODO");
    },
});
