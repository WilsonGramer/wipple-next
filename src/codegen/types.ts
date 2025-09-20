import { CodegenItem } from ".";
import { Node } from "../db";

export const parameterType = (name: Node): CodegenItem => ({
    codegen: (codegen) => {
        throw new Error("TODO");
    },
});

export const namedType = (name: Node, parameters: CodegenItem[]): CodegenItem => ({
    codegen: (codegen) => {
        throw new Error("TODO");
    },
});

export const functionType = (params: CodegenItem[], returnType: CodegenItem): CodegenItem => ({
    codegen: (codegen) => {
        throw new Error("TODO");
    },
});

export const tupleType = (elements: CodegenItem[]): CodegenItem => ({
    codegen: (codegen) => {
        throw new Error("TODO");
    },
});

export const blockType = (output: CodegenItem): CodegenItem => ({
    codegen: (codegen) => {
        throw new Error("TODO");
    },
});

export const intrinsicType = (): CodegenItem => ({
    codegen: (codegen) => {
        throw new Error("TODO");
    },
});
