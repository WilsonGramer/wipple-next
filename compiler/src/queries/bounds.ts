import { Bounds } from "../typecheck/constraints/bound";
import { query } from "./query";

export const unresolvedBound = query(function* (node) {
    for (const { bound, instance } of node.facts.get(Bounds) ?? []) {
        if (instance == null) {
            yield { bound };
        }
    }
});
