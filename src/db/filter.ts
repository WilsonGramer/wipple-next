import { Db } from ".";
import { Node } from "./node";

export type Filter = { start: number; end: number } | { lines: number[] };

export const nodeFilter =
    (filters: Filter[]) =>
    (node: Node): boolean => {
        if (node.isHidden) {
            return false;
        }

        if (filters.length === 0) {
            return true;
        }

        const { start, end } = node.span.range;

        return filters.some((filter) => {
            if ("lines" in filter) {
                return filter.lines.includes(start.line);
            } else {
                return start.offset >= filter.start && end.offset <= filter.end;
            }
        });
    };
