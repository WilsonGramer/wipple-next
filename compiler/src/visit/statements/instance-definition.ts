import { HasInstance, Visit } from "../visitor";
import { Fact, Node } from "../../db";
import { InstanceDefinitionStatement } from "../../syntax";
import { InstantiateConstraint, TypeConstraint } from "../../typecheck";
import { parseInstanceAttributes } from "../attributes";
import { visitType } from "../types";
import { visitConstraint } from "../constraints";
import { visitExpression } from "../expressions";
import { InstanceDefinition } from "../definitions";
import { Token } from "../../syntax/parser";

export class ParameterInInstanceDefinition extends Fact<Node> {}
export class TraitInInstanceDefinition extends Fact<Node> {}
export class ConstraintInInstanceDefinition extends Fact<Node> {}
export class ValueInInstanceDefinition extends Fact<Node> {}
export class IsUnresolvedInstance extends Fact<null> {}
export class MissingValueInInstance extends Fact<null> {}
export class ResolvedInstance extends Fact<Node> {}
export class IsErrorInstance extends Fact<Token[]> {}

export const visitInstanceDefinition: Visit<InstanceDefinitionStatement> = (
    visitor,
    statement,
    definitionNode,
) => {
    visitor.withDefinition(definitionNode, () => {
        const attributes = parseInstanceAttributes(visitor, statement.attributes);

        visitor.pushScope();

        let trait: Node | undefined;
        let value: Node | undefined;
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

            visitor.currentDefinition!.implicitTypeParameters = false;

            for (const constraint of statement.constraints.constraints) {
                visitor.visit(constraint, ConstraintInInstanceDefinition, visitConstraint);
            }

            visitor.addConstraints(
                new InstantiateConstraint({
                    source: definitionNode,
                    definition: traitDefinition.node,
                    replacements: new Map([[traitDefinition.node, definitionNode]]),
                    substitutions,
                }),
            );

            if (statement.value != null) {
                value = visitor.visit(statement.value, ValueInInstanceDefinition, visitExpression);
                visitor.addConstraints(new TypeConstraint(value, definitionNode));
            } else if (attributes.error == null) {
                visitor.db.add(definitionNode, new MissingValueInInstance(null));
            }

            visitor.db.add(
                traitDefinition.node,
                new HasInstance({
                    node: definitionNode,
                    substitutions,
                    default: attributes.default,
                    error: attributes.error,
                }),
            );

            visitor.defineInstance(trait, definition);
        });

        visitor.popScope();

        const definition: InstanceDefinition = {
            type: "instance",
            node: definitionNode,
            comments: statement.comments,
            attributes,
            value: () => value,
        };

        if (attributes.error) {
            visitor.db.add(definitionNode, new IsErrorInstance(statement.comments));
        }

        return definition;
    });
};
