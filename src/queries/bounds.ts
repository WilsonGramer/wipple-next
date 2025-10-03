import { query } from "./query";
import { HasUnresolvedBound } from "../typecheck/constraints/bound";

export const unresolvedBound = query(function* (db) {
    for (const [node, bound] of db.list(HasUnresolvedBound)) {
        yield { node, bound };
    }
});
