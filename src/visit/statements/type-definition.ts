import { Visit } from "../visitor";
import { Fact, Node } from "../../db";
import { TypeDefinitionStatement } from "../../syntax";
import { TypeConstraint, types } from "../../typecheck";
import { parseTypeAttributes } from "../attributes";
import { ConstructorDefinition, TypeDefinition } from "../definitions";
import { visitType } from "../types";
import * as codegen from "../../codegen";

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

        const parameters = statement.parameters.map(({ name, infer }) =>
            visitor.visit(name, ParameterInTypeDefinition, (visitor, parameter, node) => {
                visitor.defineName(parameter.value, {
                    type: "typeParameter",
                    name: parameter.value,
                    node,
                });

                visitor.addConstraints(new TypeConstraint(node, types.parameter(node)));

                if (infer) {
                    visitor.db.add(node, new IsInvalidInferredTypeParameter(null));
                }
            }),
        );

        visitor.addConstraints(
            new TypeConstraint(definitionNode, types.named(definitionNode, parameters)),
        );

        // Types don't have additional constraints

        if (!attributes.intrinsic) {
            visitor.enqueue("afterTypeDefinitions", () => {
                switch (statement.representation.type) {
                    case "marker": {
                        const markerNode = visitor.node(statement.name);

                        visitor.withDefinition(markerNode, () => {
                            markerNode.setCodegen(codegen.markerExpression());

                            visitor.addConstraints(
                                new TypeConstraint(
                                    markerNode,
                                    types.named(definitionNode, parameters),
                                ),
                            );

                            const constructorDefinition: ConstructorDefinition = {
                                type: "constructor",
                                node: markerNode,
                                comments: statement.comments,
                            };

                            visitor.defineName(statement.name.value, constructorDefinition);

                            return constructorDefinition;
                        });

                        break;
                    }
                    case "structure": {
                        for (const field of statement.representation.fields) {
                            visitor.visit(field.type, FieldInTypeDefinition, visitType);
                        }

                        visitor.popScope();

                        // Structures are created via structure expressions instead of a
                        // constructor function
                        break;
                    }
                    case "enumeration": {
                        const scope = visitor.peekScope();

                        statement.representation.variants.forEach((variant, index) => {
                            const variantNode = visitor.node(variant.name);
                            visitor.withDefinition(variantNode, () => {
                                const elements = variant.elements.map((element) =>
                                    visitor.visit(
                                        element,
                                        VariantElementInTypeDefinition,
                                        visitType,
                                    ),
                                );

                                visitor.popScope();

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
                                                  codegen.ifStatement(
                                                      elementInputs.map((input, index) =>
                                                          codegen.assignCondition(
                                                              input,
                                                              elementVariables[index],
                                                          ),
                                                      ),
                                                      [],
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
                                            ? types.function(
                                                  elements,
                                                  types.named(definitionNode, parameters),
                                              )
                                            : types.named(definitionNode, parameters),
                                    ),
                                );

                                const constructorDefinition: ConstructorDefinition = {
                                    type: "constructor",
                                    node: variantNode,
                                    comments: statement.comments,
                                };

                                visitor.defineName(variant.name.value, constructorDefinition);

                                visitor.pushScope(scope); // for the next variant

                                return constructorDefinition;
                            });
                        });

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
