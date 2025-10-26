import { CodegenItem } from ".";
import { Node } from "../db";
import { Type, TypeParameter } from "../typecheck/constraints/type";

export const variableExpression = (id: Node): CodegenItem => ({
    codegen: (codegen) => {
        codegen.write(codegen.node(id));
    },
});

export const constantExpression = (
    id: Node,
    substitutions: Map<TypeParameter, Type>,
): CodegenItem => ({
    codegen: (codegen) => {
        codegen.write(`await runtime.constant(${codegen.node(id)}, types, {`);

        substitutions.forEach((type, parameter) => {
            codegen.write(`${codegen.node(parameter.source)}: `);
            codegen.write(type);
            codegen.write(", ");
        });

        codegen.write("})");
    },
});

export const traitExpression = (
    id: Node,
    substitutions: Map<TypeParameter, Type>,
): CodegenItem => ({
    codegen: (codegen) => {
        codegen.write(`await runtime.trait(${codegen.node(id)}, types, {`);

        substitutions.forEach((type, parameter) => {
            codegen.write(`${codegen.node(parameter.source)}: `);
            codegen.write(type);
            codegen.write(", ");
        });

        codegen.write("})");
    },
});

export const callExpression = (func: CodegenItem, inputs: CodegenItem[]): CodegenItem => ({
    codegen: (codegen) => {
        codegen.write("await (");
        codegen.write(func);
        codegen.write(")(");

        inputs.forEach((input) => {
            codegen.write(input);
            codegen.write(", ");
        });

        codegen.write(")");
    },
});

export const markerExpression = (): CodegenItem => ({
    codegen: (codegen) => {
        codegen.write("null");
    },
});

export const structureExpression = (fields: Map<string, CodegenItem>): CodegenItem => ({
    codegen: (codegen) => {
        codegen.write("{");

        for (const [key, value] of fields) {
            codegen.write(`${JSON.stringify(key)}: `);
            codegen.write(value);
            codegen.write(", ");
        }

        codegen.write("}");
    },
});

export const variantExpression = (index: number, elements: Node[]): CodegenItem => ({
    codegen: (codegen) => {
        codegen.write(`runtime.variant(${index}, [`);

        elements.forEach((element) => {
            codegen.write(codegen.node(element));
            codegen.write(", ");
        });

        codegen.write("])");
    },
});

export const intrinsicExpression = (name: string, inputs: CodegenItem[]): CodegenItem => ({
    codegen: (codegen) => {
        codegen.write(`await runtime[${JSON.stringify(name)}](`);

        inputs.forEach((input) => {
            codegen.write(input);
            codegen.write(", ");
        });

        codegen.write(")");
    },
});

export const stringExpression = (value: string): CodegenItem => ({
    codegen: (codegen) => {
        codegen.write(JSON.stringify(value));
    },
});

export const numberExpression = (value: string): CodegenItem => ({
    codegen: (codegen) => {
        codegen.write(value);
    },
});

export const formatExpression = (
    segments: [string, CodegenItem][],
    trailing: string,
): CodegenItem => ({
    codegen: (codegen) => {
        codegen.write("(");

        segments.forEach(([text, input], index) => {
            if (index > 0) {
                codegen.write(" + ");
            }

            codegen.write(`${JSON.stringify(text)} + `);
            codegen.write(input);
        });

        codegen.write(` + ${JSON.stringify(trailing)})`);
    },
});

export const functionExpression = (
    parameters: Node[],
    variables: Node[],
    body: CodegenItem[],
): CodegenItem => ({
    codegen: (codegen) => {
        codegen.write("(async (");

        parameters.forEach((parameter) => {
            codegen.write(`${codegen.node(parameter)},`);
        });

        codegen.write(") => {\n");

        variables.forEach((variable) => {
            codegen.write(`let ${codegen.node(variable)};\n`);
        });

        body.forEach((statement, index) => {
            if (index === body.length - 1) {
                codegen.write("return ");
            }

            codegen.write(statement);
        });

        codegen.write("})");
    },
});

export const tupleExpression = (elements: CodegenItem[]): CodegenItem => ({
    codegen: (codegen) => {
        codegen.write("[");

        elements.forEach((element) => {
            codegen.write(element);
            codegen.write(", ");
        });

        codegen.write("]");
    },
});
