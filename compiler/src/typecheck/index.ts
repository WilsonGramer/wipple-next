import { Node } from "../node";
import type { TypeParameterNode } from "../nodes/types/parameter";
import type { Solver } from "./solve";

export interface ConstructedType {
    tag: unknown;
    children: Type[];
    instantiate?: TypeParameterNode;
    display: (children: ((root?: boolean) => string)[], root: boolean) => string;
    solver?: Solver;
}

export type Type = Node | ConstructedType;

export const cloneType = <T extends Type>(type: T): T =>
    type instanceof Node ? type : { ...type, children: type.children.map(cloneType) };

export const displayType = (type: Type, root = true): string => {
    if (type instanceof Node) {
        return "_";
    } else {
        const children = type.children.map(
            (child) =>
                (root = false) =>
                    displayType(child, root),
        );

        return type.display(children, root);
    }
};

export const traverseType = (type: Type, f: (type: Type) => Type): Type => {
    type = f(type);

    return type instanceof Node
        ? type
        : { ...type, children: type.children.map((child) => traverseType(child, f)) };
};

export const typeReferencesNode = (type: Type, ...nodes: (Node | undefined)[]) => {
    let referencesNode = false;
    traverseType(type, (type) => {
        referencesNode ||=
            nodes.length > 0 ? nodes.some((node) => type === node) : type instanceof Node;
        return type;
    });

    return referencesNode;
};

export const typesAreEqual = (left: Type, right: Type): boolean => {
    if (left instanceof Node || right instanceof Node) {
        return left === right;
    } else {
        return (
            left.tag === right.tag &&
            left.children.length === right.children.length &&
            left.children.every((leftChild, index) => {
                const rightChild = right.children[index];
                return typesAreEqual(leftChild, rightChild);
            })
        );
    }
};

export const instantiateType = (
    type: Type,
    source: Node,
    replacements: Map<Node, Node>,
    substitutions: Map<TypeParameterNode, Type>,
) =>
    traverseType(type, (type) => {
        if (type instanceof Node) {
            return getOrInstantiate(type, source, replacements);
        } else if (type.instantiate != null) {
            const parameter = type.instantiate;

            if (substitutions.has(parameter)) {
                return substitutions.get(parameter)!;
            } else {
                const substitution = parameter.instantiate(source);
                substitutions.set(parameter, substitution);
                return substitution;
            }
        } else {
            return type;
        }
    });

export const getOrInstantiate = (node: Node, source: Node, replacements: Map<Node, Node>): Node => {
    if (replacements.has(node)) {
        return replacements.get(node)!;
    } else {
        const instantiated = node.instantiate(source);
        replacements.set(node, instantiated);
        return instantiated;
    }
};

export * as types from "./types";
