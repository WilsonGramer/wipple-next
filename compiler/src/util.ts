import { InternalNode, type Node } from "./node";
import { type Fact } from "./db";

export function* zip<A, B>(
    left: Iterable<A>,
    right: Iterable<B>,
    options: {
        onmissing: (value: NoInfer<A>) => NoInfer<B>;
        onextra: (value: NoInfer<B>) => void;
    },
): Generator<[A, B]> {
    const leftIter = Iterator.from(left);
    const rightIter = Iterator.from(right);

    for (const left of leftIter) {
        const right = rightIter.next();
        yield [left, right.value !== undefined ? right.value : options.onmissing(left)];
    }

    for (const extra of rightIter) {
        options.onextra(extra);
    }
}

export const zipNodes = <A extends Node, B extends Node>(
    left: Iterable<A>,
    right: Iterable<B>,
    options: {
        missing: typeof Fact<null>;
        extra: typeof Fact<null>;
    },
) =>
    zip<A, B | InternalNode>(left, right, {
        onmissing: (node: Node) => {
            node.facts.set(options.missing, null);
            const missing = new InternalNode(node.span);
            node.db.register(missing);
            return missing;
        },
        onextra: (node: Node) => {
            node.facts.set(options.extra, null);
        },
    });

export const zipNodeMaps = <K, A extends Node, B extends Node>(
    left: Map<K, A>,
    right: Iterable<[K, B]>,
    options: {
        missing: typeof Fact<null>;
        extra: typeof Fact<null>;
        duplicate: typeof Fact<null>;
    },
) => {
    const result = new Map<K, [A, B | InternalNode]>();
    for (const [key, value] of right) {
        if (result.has(key)) {
            value.facts.set(options.duplicate, null);
        } else if (left.has(key)) {
            result.set(key, [left.get(key)!, value]);
        } else {
            value.facts.set(options.extra, null);
        }
    }

    for (const [key, value] of left) {
        if (!result.has(key)) {
            value.facts.set(options.missing, null);
            const missing = new InternalNode(value.span);
            value.db.register(missing);
            result.set(key, [value, missing]);
        }
    }

    return new Map(result.values());
};
