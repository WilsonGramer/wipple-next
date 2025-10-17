import { inspect } from "node:util";
import { LocationRange } from "../syntax";

export class Span {
    path: string;
    range: LocationRange;

    constructor(path: string, range: LocationRange) {
        this.path = path;
        this.range = range;
    }

    toString() {
        return `${this.path}:${this.range.start.line}:${this.range.start.column}-${this.range.end.line}:${this.range.end.column}`;
    }

    [inspect.custom]() {
        return this.toString();
    }

    sort(other: Span): number {
        if (this.path !== other.path) {
            return this.path.localeCompare(other.path);
        }

        if (this.range.start.offset !== other.range.start.offset) {
            return this.range.start.offset - other.range.start.offset;
        }

        if (this.range.end.offset !== other.range.end.offset) {
            return this.range.end.offset - other.range.end.offset;
        }

        return 0;
    }
}
