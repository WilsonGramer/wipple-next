import { Db } from "../db";

export type Query<T> = (db: Db) => Generator<T>;

export const query = <T>(query: Query<T>) => query;
