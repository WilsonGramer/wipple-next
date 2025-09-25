import { HasInstance, Visit } from "../visitor";
import { Fact, Node } from "../../db";
import { InstanceDefinitionStatement } from "../../syntax";
import { InstantiateConstraint, TypeConstraint } from "../../typecheck";
import { parseInstanceAttributes } from "../attributes";
import { visitType } from "../types";
import { visitConstraint } from "../constraints";
import { visitExpression } from "../expressions";
import { InstanceDefinition } from "../definitions";

export class ParameterInInstanceDefinition extends Fact<Node> {}
export class TraitInInstanceDefinition extends Fact<Node> {}
export class ConstraintInInstanceDefinition extends Fact<Node> {}
export class ValueInInstanceDefinition extends Fact<Node> {}
export class IsUnresolvedInstance extends Fact<null> {}
export class ResolvedInstance extends Fact<Node> {}

export const visitInstanceDefinition: Visit<InstanceDefinitionStatement> = (
    visitor,
    statement,
    definitionNode,
) => {
    visitor.withDefinition(definitionNode, () => {
        const attributes = parseInstanceAttributes(visitor, statement.attributes);

        let trait: Node | undefined;
        let value: Node;
        visitor.enqueue("afterTypeDefinitions", () => {
            const traitDefinition = visitor.resolveName(
                statement.constraints.bound.trait.value,
                definitionNode,
                (definition) => {
                    switch (definition.type) {
                        case "trait":
                            return [definition, TraitInInstanceDefinition];
                        default:
                            return undefined;
                    }
                },
            );

            if (traitDefinition == null) {
                visitor.db.add(definitionNode, new IsUnresolvedInstance(null));
                return;
            }

            trait = traitDefinition.node;

            visitor.db.add(definitionNode, new ResolvedInstance(traitDefinition.node));

            visitor.currentDefinition!.implicitTypeParameters = true;

            const parameters = statement.constraints.bound.parameters.map((type) =>
                visitor.visit(type, ParameterInInstanceDefinition, visitType),
            );

            // TODO: Ensure `parameters` has the right length
            const substitutions = new Map(
                traitDefinition.parameters.map((parameter, index) => [
                    parameter,
                    parameters[index],
                ]),
            );

            for (const constraint of statement.constraints.constraints) {
                visitor.visit(constraint, ConstraintInInstanceDefinition, visitConstraint);
            }

            visitor.currentDefinition!.implicitTypeParameters = false;

            value = visitor.visit(statement.value, ValueInInstanceDefinition, visitExpression);

            visitor.addConstraints(
                new InstantiateConstraint({
                    source: definitionNode,
                    definition: traitDefinition.node,
                    replacements: new Map([[traitDefinition.node, definitionNode]]),
                    substitutions,
                }),
                new TypeConstraint(value, definitionNode),
            );

            visitor.db.add(traitDefinition.node, new HasInstance([definitionNode, substitutions]));

            visitor.defineInstance(trait, definition);
        });

        const definition: InstanceDefinition = {
            type: "instance",
            node: definitionNode,
            comments: statement.comments,
            attributes,
            value: () => value,
        };

        return definition;
    });
};
