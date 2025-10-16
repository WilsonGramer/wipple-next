import { Node } from "./node";

export type Filter =
    | { path: string }
    | { path: string; start: number; end: number }
    | { path: string; lines: number[] };

export const nodeFilter =
    (filters: Filter[] = []) =>
    (node: Node): boolean => {
        if (node.isHidden) {
            return false;
        }

        if (filters.length === 0) {
            return true;
        }

        const { start, end } = node.span.range;

        return filters.some((filter) => {
            if ("path" in filter && filter.path !== node.span.path) {
                return false;
            }

            if ("lines" in filter) {
                return filter.lines.includes(start.line);
            }

            if ("start" in filter && "end" in filter) {
                return start.offset >= filter.start && end.offset <= filter.end;
            }

            return true;
        });
    };
