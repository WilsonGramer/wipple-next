import chalk from "chalk";
import { Node } from "../db";
import dedent from "dedent";
import { displayType, Type } from "../typecheck/constraints/type";
import { Bound, displayBound } from "../typecheck/constraints/bound";

export interface RenderedFeedback {
    strings: TemplateStringsArray;
    values: Renderable[];
    toString: () => string;
}

export const render = (
    strings: TemplateStringsArray,
    ...values: Renderable[]
): RenderedFeedback => ({
    strings,
    values,
    toString: () =>
        dedent(
            values.map((value, index) => strings[index] + value.toString()).join("") +
                strings[strings.length - 1],
        ).trim(),
});

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
    bound: Bound;

    constructor(bound: Bound) {
        this.bound = bound;
    }

    toString() {
        return chalk.blue(displayBound(this.bound));
    }
}

render.bound = (bound: Bound) => new RenderableBound(bound);

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
