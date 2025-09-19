import { Codegen } from ".";
import { Node } from "../db";
import { Type } from "../typecheck/constraints/type";

export const variableExpression = (id: Node) => (codegen: Codegen) => {
    throw new Error("TODO");
};

export const constantExpression =
    (id: Node, substitutions: Map<Node, Type>) => (codegen: Codegen) => {
        throw new Error("TODO");
    };

export const traitExpression = (id: Node, substitutions: Map<Node, Type>) => (codegen: Codegen) => {
    throw new Error("TODO");
};

export const callExpression = (func: Node, inputs: Node[]) => (codegen: Codegen) => {
    throw new Error("TODO");
};

export const doExpression = (block: Node) => (codegen: Codegen) => {
    throw new Error("TODO");
};

export const markerExpression = () => (codegen: Codegen) => {
    throw new Error("TODO");
};

export const listExpression = (elements: Node[]) => (codegen: Codegen) => {
    throw new Error("TODO");
};

export const variantExpression = (index: number, elements: Node[]) => (codegen: Codegen) => {
    throw new Error("TODO");
};

export const intrinsicExpression = (name: string, inputs: Node[]) => (codegen: Codegen) => {
    throw new Error("TODO");
};

export const stringExpression = (value: string) => (codegen: Codegen) => {
    throw new Error("TODO");
};

export const numberExpression = (value: string) => (codegen: Codegen) => {
    throw new Error("TODO");
};

export const formatExpression =
    (segments: [string, Node][], trailing: string) => (codegen: Codegen) => {
        throw new Error("TODO");
    };

export const functionExpression = (params: Node[], body: Node[]) => (codegen: Codegen) => {
    throw new Error("TODO");
};

export const tupleExpression = (elements: Node[]) => (codegen: Codegen) => {
    throw new Error("TODO");
};

export const whenExpression = (input: Node, arms: [Node, Node][]) => (codegen: Codegen) => {
    throw new Error("TODO");
};
