import { Node } from "../../db";
import { Solver } from "../solve";
import { getOrInstantiate, Score } from ".";
import { Constraint } from "./constraint";
import { CodegenItem } from "../../codegen";

export class TypeParameter {
    private static counter = 0;

    id: string;
    name: string;
    source: Node;
    infer: boolean;

    constructor(name: string, source: Node, infer: boolean) {
        this.id = `<parameter ${TypeParameter.counter++}>`;
        this.name = name;
        this.source = source;
        this.infer = infer;
    }

    toString() {
        return this.name;
    }
}

export class TypeConstraint extends Constraint {
    node: Node;
    type: Type;
    onlyIfInstantiated: boolean;
    isDefault: boolean;

    private instantiated = false;

    constructor(node: Node, type: Type, { isDefault = false, onlyIfInstantiated = false } = {}) {
        super();
        this.node = node;
        this.type = type;
        this.onlyIfInstantiated = onlyIfInstantiated;
        this.isDefault = isDefault;
    }

    score(): Score {
        return this.referencedNodes().length > 0 ? "group" : "type";
    }

    instantiate(
        _solver: Solver,
        source: Node,
        replacements: Map<Node, Node>,
        substitutions: Map<TypeParameter, Type>,
    ): this | void {
        const node = getOrInstantiate(this.node, source, replacements);
        const type = instantiateType(this.type, source, replacements, substitutions);

        const constraint = new TypeConstraint(node, type, {
            onlyIfInstantiated: this.onlyIfInstantiated,
            isDefault: this.isDefault,
        }) as this;

        constraint.instantiated = true;

        return constraint;
    }

    run(solver: Solver): this | void {
        if (this.onlyIfInstantiated && !this.instantiated) {
            return;
        }

        if (this.isDefault && !(solver.apply(this.node) instanceof Node)) {
            return;
        }

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
    tag: unknown;
    children: Type[];
    display: (children: ((root?: boolean) => string)[], root: boolean) => string;
    codegen: CodegenItem;
}

export type Type = Node | ConstructedType;

export const cloneType = <T extends Type>(type: T): T =>
    type instanceof Node ? type : { ...type, children: type.children.map(cloneType) };

export const displayType = (type: Type, root = true): string => {
    if (type instanceof Node) {
        return type.toString() || "_";
    } else {
        const children = type.children.map(
            (child) =>
                (root = false) =>
                    displayType(child, root),
        );

        return type.display(children, root);
    }
};

export const traverseType = (type: Type, f: (type: Type) => Type, stack: Node[] = []): Type => {
    type = f(type);

    if (type instanceof Node) {
        if (stack.includes(type)) {
            return type; // recursive type
        }

        stack.push(type);
    }

    const applied =
        type instanceof Node
            ? type
            : {
                  ...type,
                  children: type.children.map((child) => traverseType(child, f, stack)),
              };

    if (type instanceof Node) {
        stack.pop();
    }

    return applied;
};

export const instantiateType = (
    type: Type,
    source: Node,
    replacements: Map<Node, Node>,
    substitutions: Map<TypeParameter, Type>,
) =>
    traverseType(type, (type) => {
        if (type instanceof Node) {
            return getOrInstantiate(type, source, replacements);
        } else if (type.tag instanceof TypeParameter) {
            if (substitutions.has(type.tag)) {
                return substitutions.get(type.tag)!;
            } else {
                const substitution = Node.instantiatedFrom(type.tag.source, source);
                substitutions.set(type.tag, substitution);
                return substitution;
            }
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
