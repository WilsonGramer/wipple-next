export abstract class Fact<T> {
    value: (T & {}) | null;

    constructor(value: (T & {}) | null) {
        this.value = value;
    }

    clone?(value: T & {}): T & {};

    display?(value: (T & {}) | null): string | undefined;

    toString() {
        if (this.value === null) {
            return this.constructor.name;
        } else {
            const displayed =
                this.display != null ? (this.display(this.value) ?? "...") : this.value;

            return `${this.constructor.name}(${displayed})`;
        }
    }
}
