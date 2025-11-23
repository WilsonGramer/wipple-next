import type { TypeAttributes } from "../../visit/attributes";
import { parseTypeAttributes } from "../../visit/attributes";
import type { Span } from "../../span";
import type { AttributeNode } from "../attributes";
import type { TypeNode } from "../types";
import { StatementNode } from "./index";
import type { TypeParameterNode } from "../types/parameter";
import type { Visitor } from "../../visit";
import {
    MarkerConstructorDefinition,
    StructureConstructorDefinition,
    TypeDefinition,
    VariantConstructorDefinition,
} from "../../visit/definitions";
import { TypeConstraint } from "../../typecheck/constraints/type";
import { types } from "../../typecheck";
import type { Node } from "../../node";
import { InternalNode } from "../../node";

export class TypeDefinitionNode extends StatementNode {
    attributes: TypeAttributes;
    name: string;
    parameters: TypeParameterNode[];
    representation: TypeRepresentation;

    constructor(
        comments: string[],
        attributes: AttributeNode[],
        name: string,
        parameters: TypeParameterNode[],
        representation: TypeRepresentation,
        span: Span,
    ) {
        super(comments, span);
        this.attributes = parseTypeAttributes(attributes);
        this.name = name;
        this.parameters = parameters;
        this.representation = representation;
    }

    *children() {
        yield* this.parameters;

        if (this.representation instanceof StructureTypeRepresentation) {
            for (const field of this.representation.fields) {
                yield field.type;
            }
        } else if (this.representation instanceof EnumerationTypeRepresentation) {
            for (const variant of this.representation.variants) {
                yield* variant.elements;
            }
        }
    }

    visit(visitor: Visitor): void {
        super.visit(visitor);

        visitor.defining(this, () => {
            visitor.pushScope();

            visitor.currentDefinition!.withImplicitTypeParameters(() => {
                for (const parameter of this.parameters) {
                    visitor.visit(parameter);
                }
            });

            const definitionType = types.named(this, this.parameters);
            visitor.constraint(new TypeConstraint(this, definitionType));

            // Types don't have additional constraints

            if (!this.attributes.intrinsic) {
                visitor.enqueue("afterTypeDefinitions", () => {
                    if (this.representation instanceof MarkerTypeRepresentation) {
                        visitor.popScope();

                        visitor.define(
                            this.name,
                            new MarkerConstructorDefinition(definition.node, this.comments),
                        );
                    } else if (this.representation instanceof StructureTypeRepresentation) {
                        const fields: Record<string, Node> = {};
                        for (const field of this.representation.fields) {
                            visitor.visit(field.type);
                            fields[field.name] = field.type;
                            // TODO: Handle duplicate fields
                        }

                        visitor.popScope();

                        visitor.define(
                            this.name,
                            new StructureConstructorDefinition(
                                definition.node,
                                this.comments,
                                fields,
                            ),
                        );
                    } else if (this.representation instanceof EnumerationTypeRepresentation) {
                        const typeConstraints = visitor.currentDefinition!.constraints;

                        const variantDefinitions = this.representation.variants.map(
                            (variant, index) => {
                                const variantNode = new InternalNode(variant.span);
                                visitor.db.register(variantNode);

                                const constructorDefinition = visitor.defining(variantNode, () => {
                                    for (const element of variant.elements) {
                                        visitor.visit(element);
                                    }

                                    // Inherit constraints from the type definition
                                    for (const constraint of [...typeConstraints]) {
                                        visitor.constraint(constraint);
                                    }

                                    const variantType =
                                        variant.elements.length > 0
                                            ? types.function(variant.elements, definitionType)
                                            : definitionType;

                                    visitor.constraint(
                                        new TypeConstraint(variantNode, variantType),
                                    );

                                    const constructorDefinition = new VariantConstructorDefinition(
                                        variantNode,
                                        index,
                                    );

                                    return constructorDefinition;
                                });

                                return {
                                    name: variant.name,
                                    constructorDefinition,
                                };
                            },
                        );

                        visitor.popScope();

                        for (const { name, constructorDefinition } of variantDefinitions) {
                            visitor.define(name, constructorDefinition);
                        }
                    } else {
                        this.representation satisfies never;
                    }
                });
            }

            visitor.popScope();

            const definition = new TypeDefinition(
                this,
                this.comments,
                this.attributes,
                this.parameters,
            );

            visitor.define(this.name, definition);

            return definition;
        });
    }
}

export type TypeRepresentation =
    | StructureTypeRepresentation
    | EnumerationTypeRepresentation
    | MarkerTypeRepresentation;

export class StructureTypeRepresentation {
    span: Span;
    fields: FieldDefinition[];

    constructor(fields: FieldDefinition[], span: Span) {
        this.span = span;
        this.fields = fields;
    }
}

export class FieldDefinition {
    span: Span;
    name: string;
    type: TypeNode;

    constructor(name: string, type: TypeNode, span: Span) {
        this.span = span;
        this.name = name;
        this.type = type;
    }
}

export class EnumerationTypeRepresentation {
    span: Span;
    variants: VariantDefinition[];

    constructor(variants: VariantDefinition[], span: Span) {
        this.span = span;
        this.variants = variants;
    }
}

export class VariantDefinition {
    span: Span;
    name: string;
    elements: TypeNode[];

    constructor(name: string, elements: TypeNode[], span: Span) {
        this.span = span;
        this.name = name;
        this.elements = elements;
    }
}

export class MarkerTypeRepresentation {
    span: Span;

    constructor(span: Span) {
        this.span = span;
    }
}
