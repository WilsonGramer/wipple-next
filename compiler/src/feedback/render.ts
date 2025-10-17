import chalk from "chalk";
import { Node } from "../db";
import dedent from "dedent";
import { displayType, Type } from "../typecheck/constraints/type";
import { Bound, displayBound } from "../typecheck/constraints/bound";
import { nodeDisplayOptions } from "../db/node";
import { Links } from "../queries";
import { Token } from "../syntax/parser";

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
                strings[strings.length - 1]
        ).trim(),
});

export const renderComments = (comments: Token[], links: Links, suffix = "") => {
    const string = comments.map((comment) => comment.value).join("\n");

    const items = string.split(/\[`([^`]+)`\]/);

    const segments: string[] = [];
    const values: Renderable[] = [];
    for (let i = 0; i < items.length - 1; i += 2) {
        segments.push(items[i]);

        const link = links[items[i + 1]];
        if (link == null) {
            values.push(render.code("_"));
            continue;
        }

        if ("and" in link) {
            values.push(render.list(link.and, "and"));
        } else if ("or" in link) {
            values.push(render.list(link.or, "or"));
        } else if (link instanceof Node) {
            values.push(link);
        } else {
            link satisfies never;
        }
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
        return chalk.blue(nodeDisplayOptions.markdown ? "`" + this.code + "`" : this.code);
    }
}

render.code = (code: string) => new RenderableCode(code);

export class RenderableType {
    type: Type;

    constructor(type: Type) {
        this.type = type;
    }

    toString() {
        const type = displayType(this.type);
        return chalk.blue(nodeDisplayOptions.markdown ? "`" + type + "`" : type);
    }
}

render.type = (type: Type) => new RenderableType(type);

export class RenderableBound {
    bound: Bound<Type>;

    constructor(bound: Bound<Type>) {
        this.bound = bound;
    }

    toString() {
        const bound = displayBound(this.bound);
        return chalk.blue(nodeDisplayOptions.markdown ? "`" + bound + "`" : bound);
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
