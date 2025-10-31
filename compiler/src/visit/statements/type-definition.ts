import { Visit } from "../visitor";
import { Fact, Node } from "../../db";
import { TypeDefinitionStatement } from "../../syntax";
import { TypeConstraint, types } from "../../typecheck";
import { parseTypeAttributes } from "../attributes";
import {
    MarkerConstructorDefinition,
    VariantConstructorDefinition,
    TypeDefinition,
    StructureConstructorDefinition,
} from "../definitions";
import { visitType } from "../types";
import * as codegen from "../../codegen";
import { TypeParameter } from "../../typecheck/constraints/type";

export class ParameterInTypeDefinition extends Fact<Node> {}
export class IsInvalidInferredTypeParameter extends Fact<null> {}
export class FieldInTypeDefinition extends Fact<Node> {}
export class VariantElementInTypeDefinition extends Fact<Node> {}

export const visitTypeDefinition: Visit<TypeDefinitionStatement> = (
    visitor,
    statement,
    definitionNode,
) => {
    visitor.withDefinition(definitionNode, () => {
        definitionNode.code = statement.name.value;

        visitor.pushScope();

        const attributes = parseTypeAttributes(visitor, statement.attributes);

        const parameters = statement.parameters.map(({ name, infer }) => {
            const source = visitor.visit(
                name,
                ParameterInTypeDefinition,
                (visitor, parameter, node) => {
                    visitor.defineName(parameter.value, {
                        type: "typeParameter",
                        name: parameter.value,
                        node,
                    });

                    if (infer) {
                        visitor.db.add(node, new IsInvalidInferredTypeParameter(null));
                    }
                },
            );

            const parameter = new TypeParameter(name.value, source, infer ?? false);

            visitor.addConstraints(new TypeConstraint(source, types.parameter(parameter)));

            return parameter;
        });

        const definitionType = types.named(definitionNode, parameters.map(types.parameter));

        // Types don't have additional constraints

        if (!attributes.intrinsic) {
            visitor.enqueue("afterTypeDefinitions", () => {
                switch (statement.representation.type) {
                    case "marker": {
                        visitor.popScope();

                        const markerNode = visitor.node(statement.name);

                        visitor.withDefinition(markerNode, () => {
                            markerNode.setCodegen(codegen.markerExpression());

                            visitor.addConstraints(new TypeConstraint(markerNode, definitionType));

                            const constructorDefinition: MarkerConstructorDefinition = {
                                type: "markerConstructor",
                                node: markerNode,
                                comments: statement.comments,
                            };

                            visitor.defineName(statement.name.value, constructorDefinition);

                            return constructorDefinition;
                        });

                        break;
                    }
                    case "structure": {
                        const fields = new Map<string, Node>();
                        for (const field of statement.representation.fields) {
                            const type = visitor.visit(
                                field.type,
                                FieldInTypeDefinition,
                                visitType,
                            );

                            fields.set(field.name.value, type);

                            // TODO: Handle duplicate fields
                        }

                        visitor.popScope();

                        const structureNode = visitor.node(statement.name);

                        visitor.withDefinition(structureNode, () => {
                            visitor.addConstraints(
                                new TypeConstraint(structureNode, definitionType),
                                new TypeConstraint(definition.node, definitionType),
                            );

                            const constructorDefinition: StructureConstructorDefinition = {
                                type: "structureConstructor",
                                node: definition.node,
                                comments: statement.comments,
                                fields,
                            };

                            visitor.defineName(statement.name.value, constructorDefinition);

                            return constructorDefinition;
                        });

                        break;
                    }
                    case "enumeration": {
                        const variants = statement.representation.variants.map((variant, index) => {
                            const variantNode = visitor.node(variant.name);

                            const constructorDefinition = visitor.withDefinition(
                                variantNode,
                                () => {
                                    const elements = variant.elements.map((element) =>
                                        visitor.visit(
                                            element,
                                            VariantElementInTypeDefinition,
                                            visitType,
                                        ),
                                    );

                                    const elementInputs = elements.map((element) =>
                                        visitor.node({ location: element.span.range }),
                                    );

                                    const elementVariables = elements.map((element) =>
                                        visitor.node({ location: element.span.range }),
                                    );

                                    variantNode.setCodegen(
                                        elements.length > 0
                                            ? codegen.functionExpression(
                                                  elementInputs,
                                                  elementVariables,
                                                  [
                                                      ...elementInputs.map((input, index) =>
                                                          codegen.ifStatement(
                                                              [
                                                                  codegen.assignCondition(
                                                                      elementVariables[index],
                                                                      input,
                                                                  ),
                                                              ],
                                                              [],
                                                          ),
                                                      ),
                                                      codegen.returnStatement(
                                                          codegen.variantExpression(
                                                              index,
                                                              elementVariables,
                                                          ),
                                                      ),
                                                  ],
                                              )
                                            : codegen.variantExpression(index, []),
                                    );

                                    visitor.addConstraints(
                                        new TypeConstraint(
                                            variantNode,
                                            elements.length > 0
                                                ? types.function(elements, definitionType)
                                                : definitionType,
                                        ),
                                    );

                                    const constructorDefinition: VariantConstructorDefinition = {
                                        type: "variantConstructor",
                                        node: variantNode,
                                        comments: statement.comments,
                                        index,
                                    };

                                    return constructorDefinition;
                                },
                            );

                            return {
                                name: variant.name.value,
                                definition: constructorDefinition,
                            };
                        });

                        visitor.popScope();

                        for (const { name, definition } of variants) {
                            visitor.defineName(name, definition);
                        }

                        break;
                    }
                    default: {
                        statement.representation satisfies never;
                    }
                }
            });
        }

        visitor.popScope();

        const definition: TypeDefinition = {
            type: "type",
            node: definitionNode,
            comments: statement.comments,
            attributes,
            parameters,
        };

        visitor.defineName(statement.name.value, definition);

        return definition;
    });
};
