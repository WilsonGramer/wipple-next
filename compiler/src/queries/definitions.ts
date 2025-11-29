import { Resolved } from "../visit";
import { query } from "./query";

export const unresolved = query(function* (node) {
    const resolved = node.facts.get(Resolved);
    if (resolved == null) {
        return;
    }

    const [name, definitions] = resolved;
    if (definitions.length === 0) {
        yield { name };
    }
});

export const ambigious = query(function* (node) {
    const resolved = node.facts.get(Resolved);
    if (resolved == null) {
        return;
    }

    const [name, definitions] = resolved;
    if (definitions.length > 1) {
        yield { name, definitions };
    }
});
