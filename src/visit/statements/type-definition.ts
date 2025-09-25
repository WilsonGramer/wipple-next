import { Visit } from "../visitor";
import { Fact, Node } from "../../db";
import { TypeDefinitionStatement } from "../../syntax";
import { TypeConstraint, types } from "../../typecheck";
import { parseTypeAttributes } from "../attributes";
import { TypeDefinition } from "../definitions";

export class ParameterInTypeDefinition extends Fact<Node> {}
export class IsInvalidInferredTypeParameter extends Fact<null> {}

export const visitTypeDefinition: Visit<TypeDefinitionStatement> = (
    visitor,
    statement,
    definitionNode,
) => {
    visitor.withDefinition(definitionNode, () => {
        definitionNode.code = statement.name.value;

        const attributes = parseTypeAttributes(visitor, statement.attributes);

        const parameters = statement.parameters.map(({ name, infer }) =>
            visitor.visit(name, ParameterInTypeDefinition, (visitor, parameter, node) => {
                visitor.defineName(parameter.value, {
                    type: "typeParameter",
                    node,
                });

                visitor.addConstraints(new TypeConstraint(node, types.parameter(node)));

                if (infer) {
                    visitor.db.add(node, new IsInvalidInferredTypeParameter(null));
                }
            }),
        );

        visitor.enqueue("afterTypeDefinitions", () => {
            switch (statement.representation.type) {
                case "marker": {
                    break;
                }
                case "structure": {
                    throw new Error("TODO");
                }
                case "enumeration": {
                    throw new Error("TODO");
                }
                case "wrapper": {
                    throw new Error("TODO");
                }
                default: {
                    statement.representation satisfies never;
                }
            }
        });

        // Types don't have additional constraints

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
