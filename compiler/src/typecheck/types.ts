import type { ConstructedType, Type } from ".";
import type { TypeDefinitionNode } from "../nodes/statements/type-definition";
import type { TypeParameterNode } from "../nodes/types/parameter";

export const named = (definition: TypeDefinitionNode, parameters: Type[]): ConstructedType => ({
    tag: definition,
    children: parameters,
    display: (parameters, root) => {
        if (parameters.length === 0) {
            return definition.name;
        } else {
            const display = `${definition.name} ${parameters.map((p) => p()).join(" ")}`;
            return root ? display : `(${display})`;
        }
    },
    codegen: (parameters) => ({
        type: "named",
        name: definition.name,
        parameters,
    }),
});

const func = (inputs: Type[], output: Type): ConstructedType => ({
    tag: func,
    children: [output, ...inputs],
    display: ([output, ...inputs], root) => {
        const display = `${inputs.map((i) => i()).join(" ")} -> ${output(true)}`;
        return root ? display : `(${display})`;
    },
    codegen: ([output, ...inputs]) => ({
        type: "function",
        inputs,
        output,
    }),
});

export { func as function };

export const tuple = (elements: Type[]): ConstructedType => ({
    tag: tuple,
    children: elements,
    display: (elements) => {
        if (elements.length === 0) {
            return "()";
        } else if (elements.length === 1) {
            return `(${elements[0](true)} ;)`;
        } else {
            return `(${elements.map((e) => e(true)).join(" ; ")})`;
        }
    },
    codegen: (elements) => ({
        type: "tuple",
        elements,
    }),
});

export const block = (output: Type): ConstructedType => ({
    tag: block,
    children: [output],
    display: ([output]) => `{${output(true)}}`,
    codegen: ([output]) => ({
        type: "block",
        output,
    }),
});

export const parameter = (node: TypeParameterNode): ConstructedType => ({
    tag: parameter,
    children: [],
    instantiate: node,
    display: () => node.name,
    codegen: ([], codegen) => ({
        type: "parameter",
        node: codegen.node(node),
    }),
});
