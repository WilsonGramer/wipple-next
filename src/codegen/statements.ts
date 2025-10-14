import { CodegenItem } from ".";
import { Node } from "../db";

export const temporaryStatement = (value: Node): CodegenItem => ({
    codegen: (codegen) => {
        codegen.write(`const ${codegen.node(value)} = `);
        codegen.write(value);
        codegen.write(";\n");
    },
});

export const ifStatement = (conditions: CodegenItem[], statements: CodegenItem[]): CodegenItem => ({
    codegen: (codegen) => {
        if (conditions.length > 0) {
            codegen.write("if (");

            conditions.forEach((condition, index) => {
                if (index > 0) {
                    codegen.write(" && ");
                }

                codegen.write(condition);
            });

            codegen.write(") {\n");
        }

        statements.forEach((statement) => {
            codegen.write(statement);
        });

        if (conditions.length > 0) {
            codegen.write("}\n");
        }
    },
});

export const expressionStatement = (expression: CodegenItem): CodegenItem => ({
    codegen: (codegen) => {
        codegen.write(expression);
        codegen.write(";\n");
    },
});

export const returnStatement = (expression: CodegenItem): CodegenItem => ({
    codegen: (codegen) => {
        codegen.write("return ");
        codegen.write(expression);
        codegen.write(";\n");
    },
});
