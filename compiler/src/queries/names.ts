import { query } from "./query";
import { IsUnresolvedVariable } from "../visit/expressions/variable";
import { IsUnresolvedBoundConstraint } from "../visit/constraints/bound";
import { IsUnresolvedConstructor } from "../visit/expressions/constructor";
import { IsUnresolvedStructureExpression } from "../visit/expressions/structure";
import { IsUnresolvedConstructorPattern } from "../visit/patterns/constructor";
import { IsUnresolvedSetPattern } from "../visit/patterns/set";
import { IsUnresolvedStructurePattern } from "../visit/patterns/structure";
import { IsUnresolvedNamedType } from "../visit/types/named";
import { IsUnresolvedParameterType } from "../visit/types/parameter";

export const unresolvedVariable = query(function* (db) {
    for (const [variable] of db.list(IsUnresolvedVariable)) {
        yield { variable };
    }

    for (const [variable] of db.list(IsUnresolvedSetPattern)) {
        yield { variable };
    }
});

export const unresolvedBoundConstraint = query(function* (db) {
    for (const [constraint] of db.list(IsUnresolvedBoundConstraint)) {
        yield { constraint };
    }
});

export const unresolvedConstructor = query(function* (db) {
    for (const [constructor] of db.list(IsUnresolvedConstructor)) {
        yield { constructor };
    }

    for (const [constructor] of db.list(IsUnresolvedConstructorPattern)) {
        yield { constructor };
    }
});

export const unresolvedStructureExpression = query(function* (db) {
    for (const [constructor] of db.list(IsUnresolvedStructureExpression)) {
        yield { constructor };
    }

    for (const [constructor] of db.list(IsUnresolvedStructurePattern)) {
        yield { constructor };
    }
});

export const unresolvedNamedType = query(function* (db) {
    for (const [type] of db.list(IsUnresolvedNamedType)) {
        yield { type };
    }
});

export const unresolvedParameterType = query(function* (db) {
    for (const [type] of db.list(IsUnresolvedParameterType)) {
        yield { type };
    }
});
