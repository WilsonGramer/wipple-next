import { Fact, Db } from "./db";
import parse, { SourceFile, SyntaxError, LocationRange } from "./syntax";
import { visit } from "./visit";
import { BoundConstraint, Group, Solver } from "./typecheck";
import { cloneType, displayType, Type } from "./typecheck/constraints/type";
import chalk from "chalk";
import {
    HasTopLevelConstraints,
    HasDefinitionConstraints,
    HasInstance,
    Definition,
} from "./visit/visitor";
import { cloneGroup } from "./typecheck/solve";
import { applyBound, displayBound } from "./typecheck/constraints/bound";
import { GenericOnlyConstraint } from "./typecheck/constraints";

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

    const definitionSolver = new Solver(db);
    for (const [_node, group] of db.list(InTypeGroup)) {
        definitionSolver.setGroup(group);
    }

    // Solve constraints from each definition, implying all bounds
    for (const [definitionNode, constraints] of db.list(HasDefinitionConstraints)) {
        const definition = info.definitions.get(definitionNode);
        if (
            definition == null ||
            (definition.type !== "constant" && definition.type !== "instance")
        ) {
            continue;
        }

        const solver = Solver.from(definitionSolver);

        const instance = db.findBy(
            HasInstance,
            (instance) => instance.node === definitionNode,
        )?.[1];

        if (instance != null) {
            solver.imply(instance);
        }

        for (const constraint of constraints) {
            if (constraint instanceof BoundConstraint) {
                solver.imply(constraint.asInstance());
            }
        }

        solver.add(...constraints);
        solver.run();

        addGroupsFrom(db, solver);
    }

    // Solve constraints from top-level expressions

    const solver = new Solver(db); // definition constraints will be retrieved from `db` as needed

    const constraints = db
        .list(HasTopLevelConstraints)
        .flatMap(([_node, constraints]) => constraints);

    solver.add(...constraints);
    solver.run();

    addGroupsFrom(db, solver);

    return { success: true };
};

const addGroupsFrom = (db: Db, solver: Solver) => {
    const groups = solver.finish();

    for (const group of groups) {
        for (const node of group.nodes) {
            db.deleteAll(node, InTypeGroup);
            db.deleteAll(node, HasType);

            db.add(node, new InTypeGroup(group));

            for (const type of group.types) {
                db.add(node, new HasType(type));
            }
        }
    }
};
