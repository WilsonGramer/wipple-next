import { Node } from "../db";
import { Type } from "./constraints/type";

export const named = (name: Node, parameters: Type[]): Type => ({
    tag: name,
    children: parameters,
    display: (parameters, root) => {
        if (parameters.length === 0) {
            return name.code;
        } else {
            const display = `${name.code} ${parameters.join(" ")}`;
            return root ? display : `(${display})`;
        }
    },
});

const func = (inputs: Type[], output: Type): Type => ({
    tag: func,
    children: [...inputs, output],
    display: (children, root) => {
        const output = children.pop()!;
        const inputs = children;

        const display = `${inputs.join(" ")} -> ${output}`;
        return root ? display : `(${display})`;
    },
});

export { func as function };

export const tuple = (elements: Type[]): Type => ({
    tag: tuple,
    children: elements,
    display: (elements) => {
        if (elements.length === 0) {
            return "()";
        } else if (elements.length === 1) {
            return `(${elements[0]} ;)`;
        } else {
            return `(${elements.join(" ; ")})`;
        }
    },
});

export const unit = () => tuple([]);

export const block = (output: Type): Type => ({
    tag: block,
    children: [output],
    display: ([output]) => `{${output}}`,
});

export const parameter = (name: Node): Type => ({
    kind: "parameter",
    tag: name,
    children: [],
    display: () => name.code,
});
