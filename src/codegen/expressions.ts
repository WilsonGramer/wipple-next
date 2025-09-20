import { CodegenItem } from ".";
import { Node } from "../db";
import { Type } from "../typecheck/constraints/type";

export const variableExpression = (id: Node): CodegenItem => ({
    codegen: (codegen) => {
        throw new Error("TODO");
    },
});

export const constantExpression = (id: Node, substitutions: Map<Node, Type>): CodegenItem => ({
    codegen: (codegen) => {
        throw new Error("TODO");
    },
});

export const traitExpression = (id: Node, substitutions: Map<Node, Type>): CodegenItem => ({
    codegen: (codegen) => {
        throw new Error("TODO");
    },
});

export const callExpression = (func: CodegenItem, inputs: CodegenItem[]): CodegenItem => ({
    codegen: (codegen) => {
        throw new Error("TODO");
    },
});

export const doExpression = (block: CodegenItem): CodegenItem => ({
    codegen: (codegen) => {
        throw new Error("TODO");
    },
});

export const markerExpression = (): CodegenItem => ({
    codegen: (codegen) => {
        throw new Error("TODO");
    },
});

export const listExpression = (elements: CodegenItem[]): CodegenItem => ({
    codegen: (codegen) => {
        throw new Error("TODO");
    },
});

export const variantExpression = (index: number, elements: CodegenItem[]): CodegenItem => ({
    codegen: (codegen) => {
        throw new Error("TODO");
    },
});

export const intrinsicExpression = (name: string, inputs: CodegenItem[]): CodegenItem => ({
    codegen: (codegen) => {
        throw new Error("TODO");
    },
});

export const stringExpression = (value: string): CodegenItem => ({
    codegen: (codegen) => {
        throw new Error("TODO");
    },
});

export const numberExpression = (value: string): CodegenItem => ({
    codegen: (codegen) => {
        throw new Error("TODO");
    },
});

export const formatExpression = (
    segments: [string, CodegenItem][],
    trailing: string,
): CodegenItem => ({
    codegen: (codegen) => {
        throw new Error("TODO");
    },
});

export const functionExpression = (params: CodegenItem[], body: CodegenItem[]): CodegenItem => ({
    codegen: (codegen) => {
        throw new Error("TODO");
    },
});

export const tupleExpression = (elements: CodegenItem[]): CodegenItem => ({
    codegen: (codegen) => {
        throw new Error("TODO");
    },
});

export const whenExpression = (
    input: CodegenItem,
    arms: [CodegenItem, CodegenItem][],
): CodegenItem => ({
    codegen: (codegen) => {
        throw new Error("TODO");
    },
});
