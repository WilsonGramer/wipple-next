import type { Visitor } from "../../visit";
import type { Span } from "../../span";
import { TypeNode } from "./index";
import { TypeDefinition } from "../../visit/definitions";
import { InstantiateConstraint } from "../../typecheck/constraints/instantiate";

export class NamedTypeNode extends TypeNode {
    name: string;
    parameters: TypeNode[];

    constructor(name: string, parameters: TypeNode[], span: Span) {
        super(span);
        this.name = name;
        this.parameters = parameters;
    }

    *children() {
        yield* this.parameters;
    }

    visit(visitor: Visitor): void {
        super.visit(visitor);

        const typeDefinition = visitor.resolve(this.name, [TypeDefinition], this);

        for (const parameter of this.parameters) {
            visitor.visit(parameter);
        }

        if (typeDefinition != null) {
            // TODO: Ensure `parameters` has the right length

            visitor.constraint(
                new InstantiateConstraint({
                    source: this,
                    definition: typeDefinition.node,
                    substitutions: new Map(
                        this.parameters.map((parameter, index) => [
                            typeDefinition.parameters[index],
                            parameter,
                        ]),
                    ),
                    replacements: new Map([[typeDefinition.node, this]]),
                }),
            );
        }
    }
}
