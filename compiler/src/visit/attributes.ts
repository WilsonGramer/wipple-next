import { Fact } from "../db";
import type { AttributeNode } from "../nodes/attributes";
import type { AttributeValue } from "../nodes/attributes/value";
import { StringAttributeValue } from "../nodes/attributes/value";

export class ExtraAttributeValue extends Fact<null> {
    display(): string {
        return "extra attribute value";
    }
}
export class UnsupportedAttribute extends Fact<null> {
    display(): string {
        return "unsupported attribute";
    }
}
export class DuplicateAttribute extends Fact<null> {
    display(): string {
        return "duplicate attribute";
    }
}
export class MismatchedAttributeValue extends Fact<null> {
    display(): string {
        return "mismatched attribute value";
    }
}
export class MissingAttributeValue extends Fact<null> {
    display(): string {
        return "missing attribute value";
    }
}

export interface VariableAttributes {}

export const parseVariableAttributes = (attributes: AttributeNode[]): VariableAttributes => ({});

export interface ConstantAttributes {
    unit?: boolean;
}

export const parseConstantAttributes = (attributes: AttributeNode[]): ConstantAttributes => ({
    unit: parseNameAttribute("unit", attributes),
});

export interface TypeAttributes {
    intrinsic?: boolean;
}

export const parseTypeAttributes = (attributes: AttributeNode[]): TypeAttributes => ({
    intrinsic: parseNameAttribute("intrinsic", attributes),
});

export interface TraitAttributes {}

export const parseTraitAttributes = (attributes: AttributeNode[]): TraitAttributes => ({});

export interface InstanceAttributes {
    default?: boolean;
    error?: boolean;
}

export const parseInstanceAttributes = (attributes: AttributeNode[]): InstanceAttributes => ({
    default: parseNameAttribute("default", attributes),
    error: parseNameAttribute("error", attributes),
});

const parseNameAttribute = (name: string, attributes: AttributeNode[]) => {
    let found = false;
    for (const attribute of attributes) {
        if (attribute.name === name) {
            if (attribute.value != null) {
                attribute.facts.set(ExtraAttributeValue, null);
            } else if (found) {
                attribute.facts.set(DuplicateAttribute, null);
            } else {
                found = true;
            }
        }
    }

    return found;
};

const parseStringValueAttribute = (name: string, attributes: AttributeNode[]) =>
    parseAssignmentAttribute(name, attributes, (value) =>
        value instanceof StringAttributeValue ? value.value : undefined,
    );

const parseAssignmentAttribute = <T>(
    name: string,
    attributes: AttributeNode[],
    f: (value: AttributeValue) => T | undefined,
) => {
    let result: T | undefined = undefined;
    for (const attribute of attributes) {
        if (attribute.name === name) {
            if (attribute.value != null) {
                if (result != null) {
                    attribute.facts.set(DuplicateAttribute, null);
                    continue;
                }

                result = f(attribute.value);

                if (result == null) {
                    attribute.facts.set(MismatchedAttributeValue, null);
                }
            } else {
                attribute.facts.set(MissingAttributeValue, null);
            }
        }
    }

    return result;
};
