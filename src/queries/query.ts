import { Db, Node } from "../db";

export type Query<T> = (db: Db, filter: (node: Node) => boolean) => Generator<T>;

export const query = <T>(query: Query<T>) => query;
