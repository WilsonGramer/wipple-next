import { Codegen } from ".";
import { Node } from "../db";
import { Type } from "../typecheck/constraints/type";

export const parameterType = (name: Node) => (codegen: Codegen) => {
    throw new Error("TODO");
};

export const namedType = (name: Node, parameters: Type[]) => (codegen: Codegen) => {
    throw new Error("TODO");
};

export const functionType = (params: Type[], returnType: Type) => (codegen: Codegen) => {
    throw new Error("TODO");
};

export const tupleType = (elements: Type[]) => (codegen: Codegen) => {
    throw new Error("TODO");
};

export const blockType = (output: Type) => (codegen: Codegen) => {
    throw new Error("TODO");
};

export const intrinsicType = () => (codegen: Codegen) => {
    throw new Error("TODO");
};

export const equalType = (left: Type, right: Type) => (codegen: Codegen) => {
    throw new Error("TODO");
};
