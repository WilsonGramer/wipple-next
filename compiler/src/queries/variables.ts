import { query } from "./query";
import { IsUnresolvedVariable, ResolvedVariable } from "../visit/expressions/variable";
import { IsVariablePattern } from "../visit/patterns/variable";

export const unusedVariable = query(function* (db) {
    for (const [variable] of db.list(IsVariablePattern)) {
        if (!db.has(ResolvedVariable, variable)) {
            yield { variable };
        }
    }
});
