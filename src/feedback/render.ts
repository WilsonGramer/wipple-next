import chalk from "chalk";
import { Node } from "../db";
import dedent from "dedent";
import { displayType, Type } from "../typecheck/constraints/type";
import { Bound, displayBound } from "../typecheck/constraints/bound";
import { Comments } from "../syntax";

export interface RenderedFeedback {
    strings: readonly string[];
    values: Renderable[];
    toString: () => string;
}

export const render = (strings: readonly string[], ...values: Renderable[]): RenderedFeedback => ({
    strings,
    values,
    toString: () =>
        dedent(
            values.map((value, index) => strings[index] + value.toString()).join("") +
                strings[strings.length - 1],
        ).trim(),
});

export const renderComments = (
    comments: Comments,
    links: Record<string, Renderable>,
    suffix = "",
) => {
    const string = comments.comments.map((comment) => comment.value).join("\n");

    const items = string.split(/\[`([^`]+)`\]/);

    const segments: string[] = [];
    const values: Renderable[] = [];
    for (let i = 0; i < items.length - 1; i += 2) {
        segments.push(items[i]);
        values.push(links[items[i + 1]] ?? "<unknown>");
    }

    segments.push(items[items.length - 1] + suffix);

    return render(segments, ...values);
};

export type Renderable = string | Node | RenderableType | RenderableBound | RenderableCode;

export class RenderableCode {
    code: string;

    constructor(code: string) {
        this.code = code;
    }

    toString() {
        return chalk.blue(this.code);
    }
}

render.code = (code: string) => new RenderableCode(code);

export class RenderableType {
    type: Type;

    constructor(type: Type) {
        this.type = type;
    }

    toString() {
        return chalk.blue(displayType(this.type));
    }
}

render.type = (type: Type) => new RenderableType(type);

export class RenderableBound {
    bound: Bound<Type>;

    constructor(bound: Bound<Type>) {
        this.bound = bound;
    }

    toString() {
        return chalk.blue(displayBound(this.bound));
    }
}

render.bound = (bound: Bound<Type>) => new RenderableBound(bound);

render.list = (values: Renderable[], separator: string) => {
    if (values.length > 2) {
        return (
            values.slice(0, values.length - 1).join(`, `) +
            `, ${separator} ` +
            values[values.length - 1]
        );
    } else if (values.length === 2) {
        return values.join(` ${separator} `);
    } else {
        return values[0].toString();
    }
};
