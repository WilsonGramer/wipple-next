import type { Node } from "../node";

export type Query<T extends Record<string, unknown>> = (
    node: Node,
    filter: (node: Node) => boolean,
) => Generator<T>;

export const query = <T extends Record<string, unknown>>(query: Query<T>) => query;
