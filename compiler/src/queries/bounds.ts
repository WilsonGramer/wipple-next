import { ResolvedBound } from "../typecheck/constraints/bound";
import { query } from "./query";

export const unresolvedBound = query(function* (node) {
    for (const { bound, instance } of node.facts.get(ResolvedBound) ?? []) {
        if (instance == null) {
            yield { bound };
        }
    }
});
