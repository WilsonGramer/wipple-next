import { Fact, Db, Node } from "./db";
import parse, { SourceFile, SyntaxError, LocationRange } from "./syntax";
import { visit } from "./visit";
import { Group, Solver } from "./typecheck";
import { cloneType, displayType, Type } from "./typecheck/constraints/type";
import chalk from "chalk";
import { HasConstraints, HasInstance } from "./visit/visitor";
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
    for (const [representative, group] of db.list(InTypeGroup)) {
        solver.setGroup(representative, group);
    }

    const constraints = db.list(HasConstraints).flatMap(([_node, constraints]) => constraints);
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

    // Also apply substitutions within definitions for codegen
    for (const [_trait, instance] of db.list(HasInstance)) {
        for (const [parameter, substitution] of instance.substitutions) {
            const appliedNode = new Node(substitution.span, substitution.code);
            appliedNode.setCodegen(solver.apply(substitution));
            instance.substitutions.set(parameter, appliedNode);
        }
    }

    return { success: true };
};
