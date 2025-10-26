import { Visit } from "../visitor";
import { Fact, Node } from "../../db";
import { TraitDefinitionStatement } from "../../syntax";
import { TypeConstraint, types } from "../../typecheck";
import { parseTraitAttributes } from "../attributes";
import { visitType } from "../types";
import { visitConstraint } from "../constraints";
import { TraitDefinition } from "../definitions";
import { TypeParameter } from "../../typecheck/constraints/type";

export class ParameterInTraitDefinition extends Fact<Node> {}
export class TypeInTraitDefinition extends Fact<Node> {}
export class ConstraintInTraitDefinition extends Fact<Node> {}

export const visitTraitDefinition: Visit<TraitDefinitionStatement> = (
    visitor,
    statement,
    definitionNode,
) => {
    visitor.withDefinition(definitionNode, () => {
        definitionNode.code = statement.name.value;

        visitor.pushScope();

        const attributes = parseTraitAttributes(visitor, statement.attributes);

        const parameters = statement.parameters.map(({ name, infer }) => {
            const source = visitor.visit(
                name,
                ParameterInTraitDefinition,
                (visitor, parameter, node) => {
                    visitor.defineName(parameter.value, {
                        type: "typeParameter",
                        name: parameter.value,
                        node,
                    });
                },
            );

            const parameter = new TypeParameter(name.value, source, infer ?? false);

            visitor.addConstraints(new TypeConstraint(source, types.parameter(parameter)));

            return parameter;
        });

        visitor.enqueue("afterTypeDefinitions", () => {
            const type = visitor.visit(
                statement.constraints.type,
                TypeInTraitDefinition,
                visitType,
            );

            visitor.addConstraints(new TypeConstraint(definitionNode, type));

            for (const constraint of statement.constraints.constraints) {
                visitor.visit(constraint, ConstraintInTraitDefinition, visitConstraint);
            }
        });

        visitor.popScope();

        const definition: TraitDefinition = {
            type: "trait",
            node: definitionNode,
            comments: statement.comments,
            attributes,
            parameters,
        };

        visitor.defineName(statement.name.value, definition);

        return definition;
    });
};
