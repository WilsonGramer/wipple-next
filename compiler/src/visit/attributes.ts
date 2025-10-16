import { Fact } from "../db";
import { Attributes, AttributeValue } from "../syntax";
import { Visitor } from "./visitor";

export class IsAttribute extends Fact<null> {}
export class IsExtraAttributeValue extends Fact<null> {}
export class IsDuplicateAttribute extends Fact<null> {}
export class IsMismatchedAttributeValue extends Fact<null> {}
export class IsMissingAttributeValue extends Fact<null> {}

export interface ConstantAttributes {
    unit?: boolean;
}

export const parseConstantAttributes = (
    visitor: Visitor,
    attributes: Attributes,
): ConstantAttributes => ({
    unit: parseNameAttribute(visitor, "unit", attributes),
});

export interface TypeAttributes {
    intrinsic?: boolean;
}

export const parseTypeAttributes = (visitor: Visitor, attributes: Attributes): TypeAttributes => ({
    intrinsic: parseNameAttribute(visitor, "intrinsic", attributes),
});

export interface TraitAttributes {}

export const parseTraitAttributes = (
    visitor: Visitor,
    attributes: Attributes,
): TypeAttributes => ({});

export interface InstanceAttributes {
    default?: boolean;
    error?: boolean;
}

export const parseInstanceAttributes = (
    visitor: Visitor,
    attributes: Attributes,
): InstanceAttributes => ({
    default: parseNameAttribute(visitor, "default", attributes),
    error: parseNameAttribute(visitor, "error", attributes),
});

const parseNameAttribute = (visitor: Visitor, name: string, attributes: Attributes) => {
    let found = false;
    for (const attribute of attributes.attributes) {
        if (attribute.name.value === name) {
            const node = visitor.node(attribute);

            if (attribute.value != null) {
                visitor.db.add(node, new IsExtraAttributeValue(null));
            } else if (found) {
                visitor.db.add(node, new IsDuplicateAttribute(null));
            } else {
                visitor.db.add(node, new IsAttribute(null));
                found = true;
            }
        }
    }

    return found;
};

const parseStringValueAttribute = (visitor: Visitor, name: string, attributes: Attributes) =>
    parseAssignmentAttribute(visitor, name, attributes, (value) => {
        switch (value.type) {
            case "string":
                return value.value;
            default:
                return undefined;
        }
    });

const parseAssignmentAttribute = <T>(
    visitor: Visitor,
    name: string,
    attributes: Attributes,
    f: (value: AttributeValue) => T | undefined,
) => {
    let result: T | undefined = undefined;
    for (const attribute of attributes.attributes) {
        if (attribute.name.value === name) {
            const node = visitor.node(attribute);

            if (attribute.value != null) {
                if (result != null) {
                    visitor.db.add(node, new IsDuplicateAttribute(null));
                    continue;
                }

                result = f(attribute.value);

                if (result == null) {
                    visitor.db.add(node, new IsMismatchedAttributeValue(null));
                }
            } else {
                visitor.db.add(node, new IsMissingAttributeValue(null));
            }
        }
    }

    return result;
};
