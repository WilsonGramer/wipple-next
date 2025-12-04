import { Db, Fact } from "./db";
import { Node } from "./node";
import type { FileNode } from "./nodes";
import { BoundConstraintNode } from "./nodes/constraints/bound";
import { Typed } from "./nodes/types";
import { nullSpan } from "./span";
import {
    BoundConstraint,
    type Instance,
    substitutionsOverlap,
} from "./typecheck/constraints/bound";
import { Solver } from "./typecheck/solve";
import type { Scope } from "./visit";
import { DefinitionConstraints, Instances, Visitor } from "./visit";

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

export const compile = (root: RootNode, files: FileNode[]) => {
    const { db } = root;
    root.files.push(...files);

    const nodeIsFromFiles = (node: Node) => files.some((file) => node.isFromFile(file));

    // Define/resolve names and collect constraints

    const topLevelScopes = db
        .list(TopLevelScopes)
        .flatMap(([, scope]) => scope)
        .toArray();

    const visitor = new Visitor(db, topLevelScopes);

    for (const file of files) {
        visitor.visit(file);
    }

    const topLevel = visitor.finish();

    root.facts.getOr(TopLevelScopes, []).push(topLevel.scope);

    // Solve constraints from each definition, implying all bounds

    for (const [definitionNode, constraints] of db.list(DefinitionConstraints)) {
        const existingGroup = definitionNode.facts.get(Typed);
        if (existingGroup != null && !existingGroup.isEmpty()) {
            // No need to check definitions multiple times
            continue;
        }

        const solver = new Solver(db);

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

        addGroupsFrom(solver, nodeIsFromFiles);
    }

    // Solve constraints from top-level expressions

    const solver = new Solver(db); // definition constraints will be retrieved from `db` as needed
    for (const [, group] of db.list(Typed)) {
        if (!group.isEmpty()) {
            solver.setGroup(group);
        }
    }

    solver.add(...topLevel.constraints);
    solver.run();

    addGroupsFrom(solver, nodeIsFromFiles);
    checkForOverlappingInstances(db, solver);
};

const addGroupsFrom = (solver: Solver, filter: (node: Node) => boolean) => {
    const groups = solver.toGroups();

    for (const group of groups) {
        if (group.isEmpty()) {
            continue;
        }

        for (const node of group.nodes) {
            if (!filter(node)) {
                continue;
            }

            node.facts.set(Typed, group);
        }
    }
};

export class OverlappingInstances extends Fact<Node[]> {
    display(instances: Node[]): string {
        return `has ${instances.length} overlapping instances`;
    }
}

const checkForOverlappingInstances = (db: Db, solver: Solver) => {
    for (const [traitDefinition, instances] of db.list(Instances)) {
        const { defaultInstances = [], nonDefaultInstances = [] } = Object.groupBy(
            instances,
            (instance) => (instance.default ? "defaultInstances" : "nonDefaultInstances"),
        );

        for (const instances of [defaultInstances, nonDefaultInstances]) {
            const overlapping = new Set<Instance>();
            for (const leftInstance of instances) {
                for (const rightInstance of instances) {
                    if (leftInstance === rightInstance) {
                        continue;
                    }

                    if (
                        substitutionsOverlap(
                            traitDefinition,
                            leftInstance.substitutions,
                            rightInstance.substitutions,
                            solver,
                        )
                    ) {
                        overlapping.add(leftInstance);
                        overlapping.add(rightInstance);
                    }
                }
            }

            if (overlapping.size > 0) {
                traitDefinition.facts.set(
                    OverlappingInstances,
                    overlapping
                        .values()
                        .map((instance) => instance.node)
                        .toArray(),
                );
            }
        }
    }
};
