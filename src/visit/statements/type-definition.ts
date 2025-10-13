import { Visit, Visitor } from "../visitor";
import { Fact, Node } from "../../db";
import { TypeDefinitionStatement } from "../../syntax";
import { TypeConstraint, types } from "../../typecheck";
import { parseTypeAttributes } from "../attributes";
import { TypeDefinition } from "../definitions";
import * as codegen from "../../codegen";
import { visitType } from "../types";
import { ConstructedType } from "../../typecheck/constraints/type";

export class ParameterInTypeDefinition extends Fact<Node> {}
export class IsInvalidInferredTypeParameter extends Fact<null> {}
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

        if (!attributes.intrinsic) {
            visitor.enqueue("afterTypeDefinitions", () => {
                generateConstructor(visitor, statement, types.named(definitionNode, parameters));
            });
        }

        // Types don't have additional constraints

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

const generateConstructor = (
    visitor: Visitor,
    statement: TypeDefinitionStatement,
    instanceType: ConstructedType,
) => {
    switch (statement.representation.type) {
        case "marker": {
            const constructorNode = visitor.node(statement.name);
            visitor.addConstraints(new TypeConstraint(constructorNode, instanceType));

            const bodyNode = visitor.node(statement.name);
            bodyNode.setCodegen(codegen.markerExpression());

            visitor.defineName(statement.name.value, {
                type: "constant",
                node: constructorNode,
                comments: statement.comments,
                attributes: {},
                value: {
                    assigned: true,
                    node: bodyNode,
                },
            });

            break;
        }
        case "structure": {
            // Structures are created via structure expressions instead of a
            // constructor function
            break;
        }
        case "enumeration": {
            statement.representation.variants.forEach((variant, index) => {
                const constructorNode = visitor.node(variant.name);

                const elementTypes = variant.elements.map((element) =>
                    visitor.visit(element, VariantElementInTypeDefinition, visitType),
                );

                visitor.addConstraints(
                    new TypeConstraint(constructorNode, types.function(elementTypes, instanceType)),
                );

                const bodyNode = visitor.node(variant.name);

                const elementInputs = variant.elements.map((element) => visitor.node(element));
                const elementVariables = variant.elements.map((element) => visitor.node(element));

                bodyNode.setCodegen(
                    codegen.functionExpression(elementInputs, elementVariables, [
                        codegen.ifStatement(
                            elementInputs.map((input, index) =>
                                codegen.assignCondition(input, elementVariables[index]),
                            ),
                            [
                                codegen.returnStatement(
                                    codegen.variantExpression(index, elementVariables),
                                ),
                            ],
                        ),
                        codegen.variantExpression(index, elementVariables),
                    ]),
                );

                visitor.defineName(variant.name.value, {
                    type: "constant",
                    node: constructorNode,
                    comments: statement.comments,
                    attributes: {},
                    value: {
                        assigned: true,
                        node: bodyNode,
                    },
                });
            });

            break;
        }
        default: {
            statement.representation satisfies never;
        }
    }
};
