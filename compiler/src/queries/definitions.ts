import { Resolved } from "../visit";
import { query } from "./query";

export const unresolved = query(function* (node) {
    const definition = node.facts.get(Resolved);
    if (typeof definition === "string") {
        yield { name: definition };
    }
});
