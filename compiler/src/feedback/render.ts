import dedent from "dedent";
import type { Node } from "../node";
import type { Type } from "../typecheck";
import { displayType } from "../typecheck";
import type { ResolvedBound } from "../typecheck/constraints/bound";
import { displayBound } from "../typecheck/constraints/bound";
import { code } from "../util/color";

export interface RenderedFeedback {
    strings: readonly string[];
    values: Renderable[];
    render: () => string;
}

export const render = (strings: readonly string[], ...values: Renderable[]): RenderedFeedback => ({
    strings,
    values,
    render: () =>
        dedent(
            values.map((value, index) => strings[index] + value.render()).join("") +
                strings[strings.length - 1],
        ),
});

export abstract class Renderable {
    abstract render(): string;
}

export class RenderableString extends Renderable {
    value: string;

    constructor(value: string) {
        super();
        this.value = value;
    }

    render() {
        return this.value;
    }
}

render.string = (value: string) => new RenderableString(value);

export class RenderableNumber extends Renderable {
    value: number;
    singular: string;
    plural: string;

    constructor(value: number, singular: string, plural: string) {
        super();
        this.value = value;
        this.singular = singular;
        this.plural = plural;
    }

    render() {
        return `${this.value} ${this.value === 1 ? this.singular : this.plural}`;
    }
}

render.number = (value: number, singular: string, plural: string) =>
    new RenderableNumber(value, singular, plural);

export class RenderableNode extends Renderable {
    node: Node;

    constructor(node: Node) {
        super();
        this.node = node;
    }

    render() {
        return this.node.render();
    }
}

render.node = (node: Node) => new RenderableNode(node);

export class RenderableCode extends Renderable {
    code: string;

    constructor(code: string) {
        super();
        this.code = code;
    }

    render() {
        return code(this.code);
    }
}

render.code = (code: string) => new RenderableCode(code);

export class RenderableType extends Renderable {
    type: Type;

    constructor(type: Type) {
        super();
        this.type = type;
    }

    render() {
        return code(displayType(this.type));
    }
}

render.type = (type: Type) => new RenderableType(type);

export class RenderableBound extends Renderable {
    bound: ResolvedBound;

    constructor(bound: ResolvedBound) {
        super();
        this.bound = bound;
    }

    render() {
        return code(displayBound(this.bound));
    }
}

render.bound = (bound: ResolvedBound) => new RenderableBound(bound);

export class RenderableList extends Renderable {
    values: Renderable[];
    separator: string;

    constructor(values: Renderable[], separator: string) {
        super();
        this.values = values;
        this.separator = separator;
    }

    render() {
        const values = this.values.map((value) => value.render());

        if (values.length > 2) {
            return (
                values.slice(0, values.length - 1).join(`, `) +
                `, ${this.separator} ` +
                values[values.length - 1].toString()
            );
        } else if (values.length === 2) {
            return values.join(` ${this.separator} `);
        } else {
            return values[0].toString();
        }
    }
}

render.list = (values: Renderable[], separator: string) => new RenderableList(values, separator);

export type Links = Record<string, Renderable | { or: Renderable[] } | { and: Renderable[] }>;

class RenderableComments extends Renderable {
    comments: string[];
    links: Links;
    suffix?: RenderedFeedback;

    constructor(comments: string[], links: Links, suffix?: RenderedFeedback) {
        super();
        this.comments = comments;
        this.links = links;
        this.suffix = suffix;
    }

    render(): string {
        const { comments, links, suffix } = this;

        const string = comments.join("\n");

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
            } else if (link instanceof Renderable) {
                values.push(link);
            } else {
                link satisfies never;
            }
        }

        segments.push(items[items.length - 1] + (suffix?.render() ?? ""));

        return render(segments, ...values).render();
    }
}

render.comments = (comments: string[], links: Links, suffix?: RenderedFeedback) =>
    new RenderableComments(comments, links, suffix);

class RenderableOptional extends Renderable {
    value: RenderedFeedback | undefined;

    constructor(value: RenderedFeedback | undefined) {
        super();
        this.value = value;
    }

    render(): string {
        return this.value?.render() ?? "";
    }
}

render.optional = (value: RenderedFeedback | undefined) => new RenderableOptional(value);
