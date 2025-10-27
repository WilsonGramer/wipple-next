import { Visit } from "../visitor";
import { Fact, Node } from "../../db";
import { StructureExpression } from "../../syntax";
import { visitExpression } from ".";
import * as codegen from "../../codegen";
import { Constraint, InstantiateConstraint } from "../../typecheck";

export class ResolvedStructureConstructor extends Fact<Node> {}
export class FieldInStructureExpression extends Fact<Node> {}
export class IsUnresolvedStructureExpression extends Fact<null> {}

export const visitStructureExpression: Visit<StructureExpression> = (visitor, expression, node) => {
    const fields = new Map<string, Node>();
    for (const field of expression.fields) {
        const value = visitor.visit(field.value, FieldInStructureExpression, visitExpression);
        fields.set(field.name.value, value);
    }

    const constraints = visitor.resolveName<Constraint[]>(
        expression.name.value,
        node,
        (definition) => {
            switch (definition.type) {
                case "structureConstructor": {
                    const replacements = new Map([[definition.node, node]]);
                    for (const [name, type] of definition.fields) {
                        const value = fields.get(name);

                        if (value != null) {
                            replacements.set(type, value);
                        } else {
                            // TODO: Handle missing field
                        }
                    }

                    return [
                        [
                            new InstantiateConstraint({
                                source: node,
                                definition: definition.node,
                                substitutions: new Map(),
                                replacements,
                            }),
                        ],
                        ResolvedStructureConstructor,
                    ];
                }
                default:
                    return undefined;
            }
        },
    );

    if (constraints != null) {
        visitor.addConstraints(...constraints);
    } else {
        visitor.db.add(node, new IsUnresolvedStructureExpression(null));
    }

    node.setCodegen(codegen.structureExpression(fields));
};
