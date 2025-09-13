import { Visit } from "../visitor";
import { Fact, Node } from "../../db";
import { TraitDefinitionStatement } from "../../syntax";
import { TypeConstraint, types } from "../../typecheck";
import { parseTraitAttributes } from "../attributes";
import { visitType } from "../types";
import { visitConstraint } from "../constraints";
import { TraitDefinition } from "../definitions";

export class ParameterInTraitDefinition extends Fact<Node> {}
export class TypeInTraitDefinition extends Fact<Node> {}
export class ConstraintInTraitDefinition extends Fact<Node> {}
export class IsInferredTypeParameter extends Fact<null> {}

export const visitTraitDefinition: Visit<TraitDefinitionStatement> = (
    visitor,
    statement,
    definitionNode,
) => {
    visitor.withDefinition(definitionNode, () => {
        definitionNode.code = statement.name.value;

        visitor.pushScope();

        const attributes = parseTraitAttributes(visitor, statement.attributes);

        const parameters = statement.parameters.map(({ name, infer }) =>
            visitor.visit(name, ParameterInTraitDefinition, (visitor, parameter, node) => {
                visitor.defineName(parameter.value, {
                    type: "typeParameter",
                    node,
                    infer,
                });

                visitor.addConstraints(new TypeConstraint(node, types.parameter(node)));

                if (infer) {
                    visitor.db.add(node, new IsInferredTypeParameter(null));
                }
            }),
        );

        const type = visitor.visit(statement.constraints.type, TypeInTraitDefinition, visitType);
        visitor.addConstraints(new TypeConstraint(definitionNode, type));

        for (const constraint of statement.constraints.constraints) {
            visitor.visit(constraint, ConstraintInTraitDefinition, visitConstraint);
        }

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
