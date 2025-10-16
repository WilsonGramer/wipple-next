import { Visit } from "../visitor";
import { Fact, Node } from "../../db";
import { StructurePattern } from "../../syntax";
import { visitPattern } from ".";
import * as codegen from "../../codegen";
import { InstantiateConstraint } from "../../typecheck";

export class IsUnresolvedStructurePattern extends Fact<null> {}
export class ResolvedStructureInStructurePattern extends Fact<Node> {}
export class ElementInStructurePattern extends Fact<Node> {}

export const visitStructurePattern: Visit<StructurePattern> = (visitor, pattern, node) => {
    const definition = visitor.resolveName(pattern.name.value, node, (definition) => {
        switch (definition.type) {
            case "structureConstructor":
                return [definition, ResolvedStructureInStructurePattern];
            default:
                return undefined;
        }
    });

    const fields = new Map<string, Node>();
    for (const field of pattern.fields) {
        const temporary = visitor.node(field);
        visitor.currentMatch.temporaries.push(temporary);
        visitor.currentMatch.conditions.push(
            codegen.fieldCondition(temporary, visitor.currentMatch.value, field.name.value),
        );

        const [value, { conditions, temporaries }] = visitor.withMatchValue(temporary, () =>
            visitor.visit(field.value, ElementInStructurePattern, visitPattern),
        );

        visitor.currentMatch.conditions.push(...conditions);
        visitor.currentMatch.temporaries.push(...temporaries);

        fields.set(field.name.value, value);
    }

    if (definition == null) {
        visitor.db.add(node, new IsUnresolvedStructurePattern(null));
        return;
    }

    const replacements = new Map([[definition.node, node]]);
    for (const [name, type] of definition.fields) {
        const value = fields.get(name);
        if (value != null) {
            replacements.set(type, value);
        }
    }

    visitor.addConstraints(
        new InstantiateConstraint({
            source: node,
            definition: definition.node,
            substitutions: new Map(),
            replacements,
        }),
    );
};
