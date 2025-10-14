import { Node } from "../db";
import { ConstructedType, Type } from "./constraints/type";
import * as codegen from "../codegen";

export const named = (name: Node, parameters: Type[]): ConstructedType => ({
    tag: name,
    children: parameters,
    display: (parameters, root) => {
        if (parameters.length === 0) {
            return name.code;
        } else {
            const display = `${name.code} ${parameters.map((p) => p()).join(" ")}`;
            return root ? display : `(${display})`;
        }
    },
    codegen: codegen.namedType(name, parameters),
});

const func = (inputs: Type[], output: Type): ConstructedType => ({
    tag: func,
    children: [output, ...inputs],
    display: ([output, ...inputs], root) => {
        const display = `${inputs.map((i) => i()).join(" ")} -> ${output(true)}`;
        return root ? display : `(${display})`;
    },
    codegen: codegen.functionType(inputs, output),
});

export { func as function };

export const tuple = (elements: Type[]): ConstructedType => ({
    tag: tuple,
    children: elements,
    display: (elements) => {
        if (elements.length === 0) {
            return "()";
        } else if (elements.length === 1) {
            return `(${elements[0]()} ;)`;
        } else {
            return `(${elements.map((e) => e()).join(" ; ")})`;
        }
    },
    codegen: codegen.tupleType(elements),
});

export const unit = () => tuple([]);

export const block = (output: Type): ConstructedType => ({
    tag: block,
    children: [output],
    display: ([output]) => `{${output()}}`,
    codegen: codegen.blockType(output),
});

export const parameter = (name: Node): ConstructedType => ({
    kind: "parameter",
    tag: name,
    children: [],
    display: () => name.code,
    codegen: codegen.parameterType(name),
});
