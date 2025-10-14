import { CodegenItem } from ".";
import { Node } from "../db";

export const parameterType = (name: Node): CodegenItem => ({
    codegen: (codegen) => {
        codegen.write(
            JSON.stringify({
                type: "parameter",
                name: codegen.node(name),
            }),
        );
    },
});

export const namedType = (name: Node, parameters: CodegenItem[]): CodegenItem => ({
    codegen: (codegen) => {
        codegen.write(
            JSON.stringify({
                type: "named",
                name: codegen.node(name),
                parameters: parameters.map((parameter) => codegen.stringify(parameter)),
            }),
        );
    },
});

export const functionType = (parameters: CodegenItem[], returnType: CodegenItem): CodegenItem => ({
    codegen: (codegen) => {
        codegen.write(
            JSON.stringify({
                type: "function",
                params: parameters.map((parameter) => codegen.stringify(parameter)),
                returnType: codegen.stringify(returnType),
            }),
        );
    },
});

export const tupleType = (elements: CodegenItem[]): CodegenItem => ({
    codegen: (codegen) => {
        codegen.write(
            JSON.stringify({
                type: "tuple",
                elements: elements.map((element) => codegen.stringify(element)),
            }),
        );
    },
});

export const blockType = (output: CodegenItem): CodegenItem => ({
    codegen: (codegen) => {
        codegen.write(
            JSON.stringify({
                type: "block",
                output: codegen.stringify(output),
            }),
        );
    },
});

export const intrinsicType = (): CodegenItem => ({
    codegen: (codegen) => {
        codegen.write(JSON.stringify({ type: "intrinsic" }));
    },
});
