import { query } from "./query";
import { Resolved } from "../visit";
import { Defined, Definition } from "../visit/definitions";

export const unresolved = query(function* (node) {
    const definition = node.facts.get(Resolved);
    if (typeof definition === "string") {
        yield { name: definition };
    }
});

export const unused = query(function* (node) {
    if (
        node.facts.get(Defined) != null &&
        node.db
            .list(Resolved)
            .filter(
                ([, definition]) => definition instanceof Definition && definition.node === node,
            )
            .next().value == null
    ) {
        yield {};
    }
});
