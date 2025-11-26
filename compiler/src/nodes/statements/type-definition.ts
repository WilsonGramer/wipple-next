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
import { fact, InternalNode } from "../../node";
import type { Codegen } from "../../codegen";
import { FunctionExpressionNode } from "../expressions/function";
import { InternalPatternNode } from "../patterns";
import { GroupConstraint } from "../../typecheck/constraints/group";

export const DuplicateField = fact("is duplicate field");
export const DuplicateVariant = fact("is duplicate variant");

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

            visitor.constraint(new TypeConstraint(this, types.named(this, this.parameters)));

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
                        const fields = new Map<string, Node>();
                        for (const field of this.representation.fields) {
                            visitor.visit(field.type);

                            if (fields.has(field.name)) {
                                field.type.facts.set(DuplicateField, null);
                            } else {
                                fields.set(field.name, field.type);
                            }
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
                                const variantNode = new InternalNode(variant.span, (codegen) => {
                                    const elementTemporaries = variant.elements.map(() => {
                                        return new InternalPatternNode(variant.span);
                                    });

                                    const result = new InternalNode(variant.span, (codegen) => {
                                        codegen.write(this.span, `runtime.variant(${index}, [`);

                                        for (const temporary of elementTemporaries) {
                                            codegen.write(this.span, codegen.node(temporary));
                                            codegen.write(this.span, ", ");
                                        }

                                        codegen.write(this.span, "])");
                                    });

                                    if (variant.elements.length === 0) {
                                        codegen.write(this.span, result);
                                    } else {
                                        const variantFunction = new FunctionExpressionNode(
                                            elementTemporaries,
                                            result,
                                            variant.span,
                                        );

                                        variantFunction.inputTemporaries = elementTemporaries;

                                        codegen.write(this.span, variantFunction);
                                    }
                                });

                                visitor.db.register(variantNode);

                                const constructorDefinition = visitor.defining(variantNode, () => {
                                    for (const element of variant.elements) {
                                        visitor.visit(element);
                                    }

                                    // Inherit constraints from the type definition
                                    for (const constraint of [...typeConstraints]) {
                                        visitor.constraint(constraint);
                                    }

                                    if (variant.elements.length === 0) {
                                        visitor.constraint(new GroupConstraint(variantNode, this));
                                    } else {
                                        visitor.constraint(
                                            new TypeConstraint(
                                                variantNode,
                                                types.function(variant.elements, this),
                                            ),
                                        );
                                    }

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

                        const defined = new Set<string>();
                        for (const { name, constructorDefinition } of variantDefinitions) {
                            if (defined.has(name)) {
                                constructorDefinition.node.facts.set(DuplicateVariant, null);
                                continue;
                            }

                            defined.add(name);

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

    codegen(_codegen: Codegen): void {
        // Not an executable statement
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
