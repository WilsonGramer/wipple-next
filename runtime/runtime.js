// @ts-nocheck

const buildRuntime = (env, proxy = (f) => f) => {
    function variant(index, values) {
        values[variant] = index;
        return values;
    }

    variant.toString = () => "<variant>";

    const constant = async (func, types, substitutions) =>
        await func(substitute(types, substitutions));

    const trait = async (instances, types, substitutions) => {
        types = substitute(types, substitutions);

        for (const [func, instanceSubstitutions] of instances) {
            const copy = {};

            let unified = true;
            for (const parameter of Object.keys(instanceSubstitutions)) {
                if (!unify(types[parameter], instanceSubstitutions[parameter], copy)) {
                    unified = false;
                    break;
                }
            }

            if (unified) {
                for (const [parameter, ty] of Object.entries(instanceSubstitutions)) {
                    // Important: don't override existing parameters -- that would
                    // prevent recursive instances from being resolved properly
                    copy[parameter] ??= ty;
                }

                return await func(copy);
            }
        }

        throw new Error(`no instance found for types ${JSON.stringify(types)}`);
    };

    const fromBoolean = (value) => (value ? variant(1, []) : variant(0, []));

    const fromMaybe = (value) => (value !== undefined ? variant(1, [value]) : variant(0, []));

    const toMaybe = (value) => {
        switch (value[variant]) {
            case 0: {
                return undefined;
            }
            case 1: {
                return value[0];
            }
            default: {
                throw new Error("expected maybe");
            }
        }
    };

    const fromOrdering = (ordering) => variant(ordering + 1, []);

    const isValidListIndex = (index, list, includeEnd = false) =>
        index === Math.floor(index) &&
        index >= 0 &&
        (includeEnd ? index <= list.length : index < list.length);

    const substitute = (types, substitutions) => {
        const copy = structuredClone(substitutions);
        for (const [parameter, ty] of Object.entries(copy)) {
            copy[parameter] = substituteType(ty, types);
        }
        return copy;
    };

    const substituteType = (ty, substitutions) => {
        if ("parameter" in ty) {
            return substitutions[ty.parameter] ?? ty;
        }

        if ("named" in ty) {
            return {
                named: [ty.named[0], ty.named[1].map((ty) => substituteType(ty, substitutions))],
            };
        }

        if ("function" in ty) {
            return {
                function: [
                    ty.function[0].map((ty) => substituteType(ty, substitutions)),
                    substituteType(ty.function[1], substitutions),
                ],
            };
        }

        if ("tuple" in ty) {
            return {
                tuple: ty.tuple.map((ty) => substituteType(ty, substitutions)),
            };
        }

        if ("block" in ty) {
            return {
                block: substituteType(ty.block, substitutions),
            };
        }

        if ("equal" in ty) {
            return {
                equal: [
                    substituteType(ty.equal[0], substitutions),
                    substituteType(ty.equal[1], substitutions),
                ],
            };
        }

        return ty;
    };

    const unify = (left, right, substitutions) => {
        if (left.type === "equal") {
            return (
                unify(left.equal[0], right, substitutions) &&
                unify(left.equal[1], left.equal[0], substitutions)
            );
        }

        if ("equal" in right) {
            return (
                unify(left, right.equal[0], substitutions) &&
                unify(right.equal[1], right.equal[0], substitutions)
            );
        }

        if (left.type === "parameter") {
            // This occurs when bounds are being resolved that involve type
            // parameters not mentioned in the item's type descriptor; no value's
            // type will ever contain a `parameter`
            return true;
        }

        if (right.type === "parameter") {
            if (right.name in substitutions) {
                return unify(left, substitutions[right.name], substitutions);
            }

            substitutions[right.name] = left;
            return true;
        }

        if (left.type === "function") {
            return (
                right.type === "function" &&
                left.inputs.length === right.inputs.length &&
                left.inputs.every((leftInput, index) =>
                    unify(leftInput, right.inputs[index], substitutions),
                ) &&
                unify(left.output, right.output, substitutions)
            );
        }

        if (left.type === "named") {
            return (
                right.type === "named" &&
                left.name === right.name &&
                left.parameters.length === right.parameters.length &&
                left.parameters.every((leftParameter, index) =>
                    unify(leftParameter, right.parameters[index], substitutions),
                )
            );
        }

        if (left.type === "tuple") {
            return (
                right.type === "tuple" &&
                left.elements.length === right.elements.length &&
                left.elements.every((leftElement, index) =>
                    unify(leftElement, right.elements[index], substitutions),
                )
            );
        }

        if (left.type === "block") {
            return right.type === "block" && unify(left.output, right.output, substitutions);
        }

        return false;
    };

    return {
        variant,
        constant,
        trait,

        debug: async (value) => {
            env.debug?.(value);
            return value;
        },

        crash: async (message) => {
            throw new Error(message);
        },

        display: async (message) => {
            await env.display(message);
            return [];
        },

        prompt: async (message, validate) => {
            let value;
            await env.prompt(
                message,
                proxy(async (input) => {
                    const validated = await validate(input);
                    value = toMaybe(validated);
                    return validated !== undefined;
                }),
            );

            if (value === undefined) {
                throw new Error("'prompt' did not validate input");
            }

            return value;
        },

        external: async (func, input) => {
            return await env[func](input);
        },

        "number-to-string": async (number) => {
            return number.toString();
        },

        "string-to-number": async (string) => {
            if (string.toLowerCase() === "nan") {
                return fromMaybe(NaN);
            } else {
                const number = parseFloat(string);
                return isNaN(number) ? none : fromMaybe(number);
            }
        },

        "add-numbers": async (left, right) => {
            return left + right;
        },

        "subtract-numbers": async (left, right) => {
            return left - right;
        },

        "multiply-numbers": async (left, right) => {
            return left * right;
        },

        "divide-numbers": async (left, right) => {
            return left / right;
        },

        "remainder-numbers": async (left, right) => {
            return left % right;
        },

        "power-numbers": async (left, right) => {
            return Math.pow(left, right);
        },

        "floor-number": async (number) => {
            return Math.floor(number);
        },

        "ceiling-number": async (number) => {
            return Math.ceil(number);
        },

        "sqrt-number": async (number) => {
            return Math.sqrt(number);
        },

        sin: async (number) => {
            return Math.sin(number);
        },

        cos: async (number) => {
            return Math.cos(number);
        },

        tan: async (number) => {
            return Math.tan(number);
        },

        "negate-number": async (number) => {
            return -number;
        },

        "string-equality": async (left, right) => {
            return fromBoolean(left === right);
        },

        "number-equality": async (left, right) => {
            return fromBoolean(left === right);
        },

        "string-ordering": async (left, right) => {
            if (left < right) {
                return fromOrdering(-1);
            } else if (left === right) {
                return fromOrdering(0);
            } else {
                return fromOrdering(1);
            }
        },

        "number-ordering": async (left, right) => {
            if (left < right) {
                return fromOrdering(-1);
            } else if (left === right) {
                return fromOrdering(0);
            } else {
                return fromOrdering(1);
            }
        },

        "make-empty-list": async () => {
            return [];
        },

        "list-first": async (list) => {
            return fromMaybe(list[0]);
        },

        "list-last": async (list) => {
            return fromMaybe(list[list.length - 1]);
        },

        "list-initial": async (list) => {
            return fromMaybe(list.length > 0 ? list.slice(0, -1) : undefined);
        },

        "list-tail": async (list) => {
            return fromMaybe(list.length > 0 ? list.slice(1) : undefined);
        },

        "list-nth": async (list, index) => {
            return fromMaybe(isValidListIndex(index, list) ? list[index] : undefined);
        },

        "list-append": async (list, element) => {
            return [...list, element];
        },

        "list-prepend": async (element, list) => {
            return [element, ...list];
        },

        "list-insert-at": async (list, index, element) => {
            return fromMaybe(
                isValidListIndex(index, list, true)
                    ? [...list.slice(0, index), element, ...list.slice(index)]
                    : undefined,
            );
        },

        "list-remove-at": async (list, index) => {
            return fromMaybe(
                isValidListIndex(index, list)
                    ? [...list.slice(0, index), ...list.slice(index + 1)]
                    : undefined,
            );
        },

        "list-count": async (list) => {
            return list.length;
        },

        "list-slice": async (list, start, end) => {
            return fromMaybe(
                isValidListIndex(start, list) && isValidListIndex(end, list, true) && start <= end
                    ? list.slice(start, end)
                    : undefined,
            );
        },

        "string-characters": async (string) => {
            return string.split("");
        },

        "random-number": async (min, max) => {
            return Math.random() * (max - min) + min;
        },

        nan: async () => {
            return NaN;
        },

        "hash-string": async (string) => {
            // https://gist.github.com/jlevy/c246006675becc446360a798e2b2d781
            let hash = 0;
            for (const char of string) {
                hash = (hash << 5) - hash + char;
            }
            return hash >>> 0;
        },

        dropdown: (options) => options,
    };
};

export default buildRuntime;
