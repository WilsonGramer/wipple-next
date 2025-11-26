import { Db, Fact } from "./db";
import { Node } from "./node";
import type { FileNode } from "./nodes";
import { BoundConstraintNode } from "./nodes/constraints/bound";
import { Typed } from "./nodes/types";
import type { Span } from "./span";
import { parseFile } from "./syntax";
import { nullSpan, SyntaxError } from "./syntax/parser";
import { BoundConstraint } from "./typecheck/constraints/bound";
import { Solver } from "./typecheck/solve";
import type { Scope } from "./visit";
import { DefinitionConstraints, Instances, Visitor } from "./visit";

export interface CompileOptions {
    files: { path: string; source: string }[];
}

export type CompileResult =
    | { success: true }
    | { success: false; type: "parse"; span: Span; message: string };

// Marker for e.g. top-level scopes
export class RootNode extends Node {
    files: FileNode[] = [];

    *children(): Generator<Node> {
        yield* this.files;
    }

    visit(_visitor: Visitor): void {}
}

export class TopLevelScopes extends Fact<Scope[]> {
    display(): string {
        return "has top-level scopes";
    }
}

export const makeRoot = () => {
    const db = new Db();

    const root = new RootNode(nullSpan("<root>"));
    db.register(root);

    return root;
};

export const compile = (root: RootNode, options: CompileOptions): CompileResult => {
    let parsedFiles: FileNode[];
    try {
        parsedFiles = options.files.map(({ path, source: code }) => parseFile(path, code));
    } catch (e) {
        if (!(e instanceof SyntaxError)) {
            throw e;
        }

        return {
            success: false,
            type: "parse",
            span: e.span,
            message: e.message,
        };
    }

    root.files.push(...parsedFiles);

    const { db } = root;

    const topLevelScopes = db
        .list(TopLevelScopes)
        .flatMap(([, scope]) => scope)
        .toArray();

    const visitor = new Visitor(db, topLevelScopes);

    for (const file of parsedFiles) {
        visitor.visit(file);
    }

    const topLevel = visitor.finish();

    root.facts.getOr(TopLevelScopes, []).push(topLevel.scope);

    const definitionSolver = new Solver(db);
    for (const [, group] of db.list(Typed)) {
        if (!group.isEmpty()) {
            definitionSolver.setGroup(group);
        }
    }

    // Solve constraints from each definition, implying all bounds
    for (const [definitionNode, constraints] of db.list(DefinitionConstraints)) {
        const existingGroup = definitionNode.facts.get(Typed);
        if (existingGroup != null && !existingGroup.isEmpty()) {
            // No need to check definitions multiple times
            continue;
        }

        const solver = Solver.from(definitionSolver);

        const instance = Iterator.from(db)
            .flatMap((node) => node.facts.get(Instances) ?? [])
            .find((instance) => instance.node === definitionNode);

        if (instance != null) {
            solver.imply(instance);
        }

        for (const constraint of constraints) {
            if (
                constraint instanceof BoundConstraint &&
                // Only imply bounds from constraints, not from inside the
                // definition's value!
                constraint.node instanceof BoundConstraintNode
            ) {
                solver.imply(constraint.asInstance());
            }
        }

        solver.add(...constraints);
        solver.run();

        addGroupsFrom(solver);
        definitionNode.facts.delete(Typed);
    }

    // Solve constraints from top-level expressions

    const solver = new Solver(db); // definition constraints will be retrieved from `db` as needed
    solver.add(...topLevel.constraints);
    solver.run();

    addGroupsFrom(solver);

    return { success: true };
};

const addGroupsFrom = (solver: Solver) => {
    const groups = solver.finish();

    for (const group of groups) {
        if (group.isEmpty()) {
            continue;
        }

        for (const node of group.nodes) {
            node.facts.set(Typed, group);
        }
    }
};
