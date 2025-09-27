import { LocationRange } from "peggy";
import { Fact, Db } from "./db";
import parse from "./syntax";
import { visit } from "./visit";
import { Group, Solver } from "./typecheck";
import { displayType, Type } from "./typecheck/constraints/type";
import chalk from "chalk";
import { HasConstraints } from "./visit/visitor";

export interface CompileOptions {
    path: string;
    code: string;
    // queries: ...
}

export type CompileResult =
    | { success: true }
    | { success: false; type: "parse"; location: LocationRange; message: string };

export class HasType extends Fact<Type> {
    display = (type: Type) => chalk.blue(displayType(type));
}

export class InTypeGroup extends Fact<Group> {
    display = (group: Group) =>
        group.nodes
            .values()
            .map((node) => chalk.blue(node))
            .toArray()
            .join(", ");
}

export const compile = (db: Db, options: CompileOptions): CompileResult => {
    const parsed = parse(options.path, options.code);

    if (!parsed.success) {
        return {
            success: false,
            type: "parse",
            location: parsed.location,
            message: parsed.message,
        };
    }

    const info = visit(parsed.value, db);

    const solver = new Solver(db);

    const constraints = db.list(HasConstraints).flatMap(([_node, constraints]) => constraints);
    solver.add(...constraints);
    solver.run();

    const groups = solver.toGroups();

    for (const group of groups.all()) {
        for (const node of group.nodes) {
            if (info.definitions.has(node)) {
                continue;
            }

            db.add(node, new InTypeGroup(group));

            for (const type of group.types) {
                db.add(node, new HasType(type));
            }
        }
    }

    return { success: true };
};
