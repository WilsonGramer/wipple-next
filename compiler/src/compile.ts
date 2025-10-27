import { Fact, Db } from "./db";
import parse, { SourceFile, SyntaxError, LocationRange } from "./syntax";
import { visit } from "./visit";
import { BoundConstraint, Group, Solver } from "./typecheck";
import { cloneType, displayType, Type } from "./typecheck/constraints/type";
import chalk from "chalk";
import {
    HasTopLevelConstraints,
    HasDefinitionConstraints,
    HasConstantValueConstraints,
    HasInstance,
} from "./visit/visitor";
import { cloneGroup } from "./typecheck/solve";

export interface CompileOptions {
    files: { path: string; code: string }[];
}

export type CompileResult =
    | { success: true }
    | { success: false; type: "parse"; location: LocationRange; message: string };

export class HasType extends Fact<Type> {
    clone = cloneType;
    display = (type: Type) => chalk.blue(displayType(type));
}

export class InTypeGroup extends Fact<Group> {
    clone = cloneGroup;

    display = (group: Group) =>
        group.nodes
            .values()
            .map((node) => chalk.blue(node))
            .toArray()
            .join(", ");
}

export const compile = (db: Db, options: CompileOptions): CompileResult => {
    let parsedFiles: SourceFile[];
    try {
        parsedFiles = options.files.map(({ path, code }) => parse(path, code));
    } catch (e) {
        if (!(e instanceof SyntaxError)) {
            throw e;
        }

        return {
            success: false,
            type: "parse",
            location: e.location,
            message: e.message,
        };
    }

    const info = visit(parsedFiles, db);

    const solver = new Solver(db);
    for (const [_node, group] of db.list(InTypeGroup)) {
        solver.setGroup(group);
    }

    // Solve constraints from each definition, implying all instances and bounds

    for (const [definition, constraints] of [
        ...db.list(HasDefinitionConstraints),
        ...db.list(HasConstantValueConstraints),
    ]) {
        for (const constraint of constraints) {
            if (constraint instanceof BoundConstraint) {
                solver.imply(constraint.asInstance());
            }
        }

        // Also imply the generic instance (i.e. without instantiating it)
        const instanceDefinition = db
            .list(HasInstance)
            .find(([_trait, instance]) => instance.node === definition);

        if (instanceDefinition != null) {
            const [_trait, instance] = instanceDefinition;
            solver.imply(instance);
        }

        solver.add(...constraints);
    }

    solver.run();

    // Solve constraints from top-level expressions

    // Now that we have concrete types, require bounds to be resolved against
    // actual instances
    solver.impliedInstances = [];
    solver.implyInstances = false;

    const constraints = db
        .list(HasTopLevelConstraints)
        .flatMap(([_node, constraints]) => constraints);

    solver.add(...constraints);
    solver.run();

    const groups = solver.finish();

    for (const group of groups) {
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
