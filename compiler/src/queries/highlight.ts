import { query } from "./query";
import { IsType } from "../visit/types";
import { HasType } from "../compile";
import { types } from "../typecheck";
import { ResolvedConstant, ResolvedVariable } from "../visit/expressions/variable";
import { ResolvedConstructor } from "../visit/expressions/constructor";

export const highlightType = query(function* (db) {
    for (const [node, _] of db.list(IsType)) {
        yield { node };
    }
});

export const highlightFunction = query(function* (db) {
    for (const [node, type] of db.list(HasType)) {
        if (
            db.has(node, ResolvedVariable) ||
            db.has(node, ResolvedConstant) ||
            db.has(node, ResolvedConstructor)
        ) {
            if ("tag" in type && type.tag === types.function) {
                yield { node };
            }
        }
    }
});

export const highlightTypeParameter = query(function* (db) {
    for (const [node, type] of db.list(HasType)) {
        if ("tag" in type && type.tag === types.parameter) {
            yield { node };
        }
    }
});
