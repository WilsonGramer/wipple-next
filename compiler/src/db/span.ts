import { inspect } from "node:util";
import { LocationRange } from "../syntax";

export class Span {
    range: LocationRange;

    constructor(range: LocationRange) {
        this.range = range;
    }

    toString() {
        return `${this.range.path}:${this.range.start.line}:${this.range.start.column}-${this.range.end.line}:${this.range.end.column}`;
    }

    [inspect.custom]() {
        return this.toString();
    }

    sort(other: Span): number {
        if (this.range.path !== other.range.path) {
            return this.range.path.localeCompare(other.range.path);
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
