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
        visitor.pushScope();

        const attributes = parseInstanceAttributes(visitor, statement.attributes);

        const trait = visitor.resolveName(
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

        if (trait == null) {
            visitor.db.add(definitionNode, new IsUnresolvedInstance(null));
            return;
        }

        visitor.db.add(definitionNode, new ResolvedInstance(trait.node));

        visitor.currentDefinition!.implicitTypeParameters = true;

        const parameters = statement.constraints.bound.parameters.map((type) =>
            visitor.visit(type, ParameterInInstanceDefinition, visitType),
        );

        // TODO: Ensure `parameters` has the right length
        const substitutions = new Map(
            trait.parameters.map((parameter, index) => [parameter, parameters[index]]),
        );

        for (const constraint of statement.constraints.constraints) {
            visitor.visit(constraint, ConstraintInInstanceDefinition, visitConstraint);
        }

        visitor.currentDefinition!.implicitTypeParameters = false;

        const value = visitor.visit(statement.value, ValueInInstanceDefinition, visitExpression);

        visitor.popScope();

        visitor.addConstraints(
            new InstantiateConstraint({
                source: definitionNode,
                definition: trait.node,
                replacements: new Map([[trait.node, definitionNode]]),
                substitutions,
            }),
            new TypeConstraint(value, definitionNode),
        );

        visitor.db.add(trait.node, new HasInstance([definitionNode, substitutions]));

        const definition: InstanceDefinition = {
            type: "instance",
            node: definitionNode,
            comments: statement.comments,
            attributes,
            trait: trait.node,
            value,
        };

        visitor.defineInstance(definition);

        return definition;
    });
};
