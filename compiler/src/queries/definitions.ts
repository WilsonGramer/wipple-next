import { query } from "./query";
import { Resolved } from "../visit";
import { Defined, Definition } from "../visit/definitions";

export const unresolved = query(function* (node) {
    const definition = node.facts.get(Resolved);
    if (typeof definition === "string") {
        yield { name: definition };
    }
});
