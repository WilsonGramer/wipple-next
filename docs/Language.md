# Language Overview

## Expressions

### `as` expressions

Convert a value to a different type.

**Implementation notes:**

- `as` desugars to a call to the `As` trait where the output is `T`, aka. `(As x) :: T`.

### `do` expressions

Run the code in a block.

**Implementation notes:**

- None

### `intrinsic` expressions

Call external runtime code.

**Implementation notes:**

- None

### `is` expressions

Check if a value matches a pattern.

**Implementation notes:**

- `is` desugars to a `when` expression that produces `True` for the provided pattern, and `False` for the wildcard pattern:

    ```wipple
    -- x is P
    when x {
      P -> True
      _ -> False
    }
    ```

    Requires `True` and `False` to be in scope.

### `when` expressions

Control flow by pattern matching.

**Implementation notes:**

- None

### Annotate expressions

Annotate the type of a value.

**Implementation notes:**

- None

### Block expressions

Store code to run it later.

**Implementation notes:**

- None

### Call expressions

Call a function with one or more inputs.

**Implementation notes:**

- None

### Collection expressions

Create a list, set, etc. using `,`.

**Implementation notes:**

- `,` desugars to a call to `Build-Collection` for each element, aka. `a, b, c` becomes `Build-Collection c (Build-Collection b (Build-Collection a Initial-Collection))`. Requires the `Build-Collection` and `Initial-Collection` traits to be in scope.

### Formatted string expressions

String interpolation.

**Implementation notes:**

- None

### Function expressions

Define a function.

**Implementation notes:**

- None

### Number expressions

Number literals.

**Implementation notes:**

- Requires the `Number` type to be in scope.

### Placeholder expressions

Indicate unfinished code.

**Implementation notes:**

- None

### String expressions

String literals.

**Implementation notes:**

- Requires the `Text` type to be in scope.

### Structure expressions

Create a structure value.

**Implementation notes:**

- None

### Trait expressions

Retrieve an instance of a trait.

**Implementation notes:**

- None

### Tuple expressions

Create a tuple using `;`.

**Implementation notes:**

- None

### Unit expressions

The empty tuple.

**Implementation notes:**

- None

### Variable expressions

Reference a variable.

**Implementation notes:**

- None

## Patterns

### `or` patterns

Match one of multiple patterns.

**Implementation notes:**

- None

### `set` patterns

Update the value of a variable.

**Implementation notes:**

- None

### Annotate patterns

Annotate the type of a pattern.

**Implementation notes:**

- None

### Destructure patterns

Extract the fields in a structure value.

**Implementation notes:**

- None

### Number patterns

Match a specific number.

**Implementation notes:**

- None

### String patterns

Match a specific string.

**Implementation notes:**

- None

### Tuple patterns

Match a tuple of patterns.

**Implementation notes:**

- None

### Unit patterns

Match the empty tuple.

**Implementation notes:**

- None

### Variable patterns

Define a new variable.

**Implementation notes:**

- None

### Variant patterns

Match one variant of an enumeration.

**Implementation notes:**

- None

### Wildcard patterns

Match any value.

**Implementation notes:**

- None

## Types

### Block types

The type of block expressions.

**Implementation notes:**

- None

### Function types

The type of functions.

**Implementation notes:**

- None

### Named types

A defined type with optional parameters.

**Implementation notes:**

- None

### Parameter types

Define or reference a type parameter.

**Implementation notes:**

- In constant and instance definitions, type parameters are implicitly created upon their first use. In type and trait definitions, they must be defined explicitly using `=>`.

### Placeholder types

An inferred type.

**Implementation notes:**

- In definitions, `_` is equivalent to a new unnamed type parameter. In type annotations, `_` infers its type from the surrounding context.

### Tuple types

The type of tuples.

**Implementation notes:**

- None

### Unit types

The type of the empty tuple.

**Implementation notes:**

- None

## Constraints

### Bound constraints

Require an instance of a trait to exist.

**Implementation notes:**

- Parameters marked `infer` on the trait definition are not considered during bound resolution; they are uniquely determined from the other type parameters.

### Default constraints

Set a fallback type for a parameter.

**Implementation notes:**

- None

## Statements

### Constant definitions

Define a new constant.

**Implementation notes:**

- None

### Instance definitions

Define a new instance of a trait.

**Implementation notes:**

- None

### Trait definitions

Define a new trait.

**Implementation notes:**

- None

### Type definitions

Define a new structure or enumeration.

**Implementation notes:**

- None

### Assignment statements

Assign a value to a pattern.

**Implementation notes:**

- None

### Expression statements

An expression in statement position.

**Implementation notes:**

- None
