import { CodegenItem } from ".";

export const ifStatement = (conditions: CodegenItem[], statements: CodegenItem[]): CodegenItem => ({
    codegen: (codegen) => {
        throw new Error("TODO");
    },
});

export const elseIfStatement = (
    conditions: CodegenItem[],
    statements: CodegenItem[],
): CodegenItem => ({
    codegen: (codegen) => {
        throw new Error("TODO");
    },
});

export const expressionStatement = (expression: CodegenItem): CodegenItem => ({
    codegen: (codegen) => {
        throw new Error("TODO");
    },
});

export const returnStatement = (expression: CodegenItem): CodegenItem => ({
    codegen: (codegen) => {
        throw new Error("TODO");
    },
});
