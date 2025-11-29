import { type Fact } from "../db";
import { InternalNode, type Node } from "../node";

export function* zip<A, B1, B2 = never>(
    left: Iterable<A>,
    right: Iterable<B1>,
    options: {
        onmissing: (value: NoInfer<A>) => NoInfer<B1> | B2;
        onextra: (value: NoInfer<B1>) => void;
    },
): Generator<[A, B1 | B2]> {
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
    node: Node,
    left: Iterable<A>,
    right: Iterable<B>,
    options: {
        missing: typeof Fact<NoInfer<A>>;
        extra: typeof Fact<null>;
    },
) =>
    zip<A, B | InternalNode>(left, right, {
        onmissing: zipNodes.onmissing(node, options.missing),
        onextra: zipNodes.onextra(options.extra),
    });

zipNodes.onmissing =
    <T>(node: Node, fact: typeof Fact<T>) =>
    (item: T) => {
        node.facts.set(fact, item);
        const missing = new InternalNode(node.span);
        node.db.register(missing);
        return missing;
    };

zipNodes.onextra = (fact: typeof Fact<null>) => (node: Node) => {
    node.facts.set(fact, null);
};

export const zipNodeMaps = <K, A extends Node, B extends Node>(
    node: Node,
    left: Map<K, A>,
    right: Iterable<[K, B]>,
    options: {
        missing: typeof Fact<NoInfer<K>>;
        extra: typeof Fact<NoInfer<K>>;
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
            value.facts.set(options.extra, key);
        }
    }

    for (const [key, value] of left) {
        if (!result.has(key)) {
            node.facts.set(options.missing, key);
            const missing = new InternalNode(value.span);
            node.db.register(missing);
            result.set(key, [value, missing]);
        }
    }

    return new Map(result.values());
};
