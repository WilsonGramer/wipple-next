import { Node } from "../../db";
import { Solver } from "../solve";
import { Constraint, getOrInstantiate, Score } from ".";

export class TypeConstraint extends Constraint {
    node: Node;
    type: Type;

    constructor(node: Node, type: Type) {
        super();
        this.node = node;
        this.type = type;
    }

    score(): Score {
        return this.referencedNodes().length > 0 ? "group" : "type";
    }

    instantiate(
        source: Node | undefined,
        replacements: Map<Node, Node>,
        substitutions: Map<Node, Type>,
    ): this | undefined {
        return new TypeConstraint(
            getOrInstantiate(this.node, source, replacements),
            instantiateType(this.type, source, replacements, substitutions),
        ) as this;
    }

    run(solver: Solver) {
        solver.unify(this.node, this.type);
    }

    private referencedNodes(): Node[] {
        const nodes: Node[] = [];
        traverseType(this.type, (type) => {
            if (type instanceof Node) {
                nodes.push(type);
            }

            return type;
        });

        return nodes;
    }
}

export interface ConstructedType {
    kind?: "parameter";
    tag: unknown;
    children: Type[];
    display: (children: string[], root: boolean) => string;
}

export type Type = Node | ConstructedType;

export const displayType = (type: Type, root = true): string => {
    if (type instanceof Node) {
        return "_";
    } else {
        const children = type.children.map((child) => displayType(child, false));
        return type.display(children, root);
    }
};

export const traverseType = (type: Type, f: (type: Type) => Type): Type => {
    type = f(type);

    return type instanceof Node
        ? type
        : { ...type, children: type.children.map((child) => traverseType(child, f)) };
};

export const instantiateType = (
    type: Type,
    source: Node | undefined,
    replacements: Map<Node, Node>,
    substitutions: Map<Node, Type>,
) =>
    traverseType(type, (type) => {
        if (type instanceof Node) {
            return getOrInstantiate(type, source, replacements);
        } else if (type.kind === "parameter") {
            if (!(type.tag instanceof Node)) {
                throw new Error("expected parameter to have a node tag");
            }

            return getOrInstantiate(type.tag, source, substitutions, replacements);
        } else {
            return type;
        }
    });

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

export const typeReferencesNode = (type: Type, node?: Node) => {
    let referencesNode = false;
    traverseType(type, (type) => {
        referencesNode ||= node != null ? type === node : type instanceof Node;
        return type;
    });

    return referencesNode;
};
