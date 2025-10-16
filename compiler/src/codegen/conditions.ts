import { CodegenItem } from ".";
import { Node } from "../db";

export const assignCondition = (matching: Node, value: Node): CodegenItem => ({
    codegen: (codegen) => {
        codegen.write(`((${codegen.node(matching)} = `);
        codegen.write(codegen.node(value));
        codegen.write(`) || true)`); // ensure assignments never fail in case `value` is falsy
    },
});

export const fieldCondition = (matching: Node, parent: Node, field: string): CodegenItem => ({
    codegen: (codegen) => {
        codegen.write(`((${codegen.node(matching)} = `);
        codegen.write(codegen.node(parent));
        codegen.write(`[${JSON.stringify(field)}]) || true)`);
    },
});

export const elementCondition = (matching: Node, parent: Node, index: number): CodegenItem => ({
    codegen: (codegen) => {
        codegen.write(`((${codegen.node(matching)} = `);
        codegen.write(codegen.node(parent));
        codegen.write(`[${index}]) || true)`);
    },
});

export const isVariantCondition = (value: Node, variantIndex: number): CodegenItem => ({
    codegen: (codegen) => {
        codegen.write(`(${codegen.node(value)}[runtime.variant] === ${variantIndex})`);
    },
});

export const isNumberCondition = (value: Node, number: string): CodegenItem => ({
    codegen: (codegen) => {
        codegen.write(`${codegen.node(value)} === ${number}`);
    },
});

export const isStringCondition = (value: Node, string: string): CodegenItem => ({
    codegen: (codegen) => {
        codegen.write(`${codegen.node(value)} === ${JSON.stringify(string)}`);
    },
});

export const orCondition = (branches: CodegenItem[][]): CodegenItem => ({
    codegen: (codegen) => {
        codegen.write("(");

        branches.forEach((conditions, index) => {
            if (index > 0) {
                codegen.write(" || ");
            }

            if (conditions.length === 0) {
                codegen.write("true");
            } else {
                codegen.write("(");

                conditions.forEach((condition, index) => {
                    if (index > 0) {
                        codegen.write(" && ");
                    }

                    codegen.write(condition);
                });

                codegen.write(")");
            }
        });

        codegen.write(")");
    },
});
