# Language Overview

## Expressions

### `as` expressions

Convert a value to a different type.

- `as` desugars to a call to the `As` trait where the output is `T`, aka. `(As x) :: T`.

### `do` expressions

Run the code in a block.

### `intrinsic` expressions

Call external runtime code.

### `is` expressions

Check if a value matches a pattern.

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

### Annotate expressions

Annotate the type of a value.

### Block expressions

Store code to run it later.

### Call expressions

Call a function with one or more inputs.

### Collection expressions

Create a list, set, etc. using `,`.

- `,` desugars to a call to `Build-Collection` for each element, aka. `a, b, c` becomes `Build-Collection c (Build-Collection b (Build-Collection a Initial-Collection))`. Requires the `Build-Collection` and `Initial-Collection` traits to be in scope.

### Format expressions

String interpolation.

### Function expressions

Define a function.

### Number expressions

Number literals.

- Requires the `Number` type to be in scope.

### Placeholder expressions

Indicate unfinished code.

### String expressions

String literals.

- Requires the `Text` type to be in scope.

### Structure expressions

Create a structure value.

### Constructor expressions

Retrieve an instance of a trait.

### Tuple expressions

Create a tuple using `;`.

### Unit expressions

The empty tuple.

### Variable expressions

Reference a variable.

## Patterns

### `or` patterns

Match one of multiple patterns.

### `set` patterns

Update the value of a variable.

### Annotate patterns

Annotate the type of a pattern.

### Destructure patterns

Extract the fields in a structure value.

### Number patterns

Match a specific number.

### String patterns

Match a specific string.

### Tuple patterns

Match a tuple of patterns.

### Unit patterns

Match the empty tuple.

### Variable patterns

Define a new variable.

### Variant patterns

Match one variant of an enumeration.

### Wildcard patterns

Match any value.

## Types

### Block types

The type of block expressions.

### Function types

The type of functions.

### Named types

A defined type with optional parameters.

### Parameter types

Define or reference a type parameter.

- In constant and instance definitions, type parameters are implicitly created upon their first use. In type and trait definitions, they must be defined explicitly using `=>`.

### Placeholder types

An inferred type.

- In definitions, `_` is equivalent to a new unnamed type parameter. In type annotations, `_` infers its type from the surrounding context.

### Tuple types

The type of tuples.

### Unit types

The type of the empty tuple.

## Constraints

### Bound constraints

Require an instance of a trait to exist.

- Parameters marked `infer` on the trait definition are not considered during bound resolution; they are uniquely determined from the other type parameters.

### Default constraints

Set a fallback type for a parameter.

## Statements

### Constant definitions

Define a new constant.

### Instance definitions

Define a new instance of a trait.

### Trait definitions

Define a new trait.

### Type definitions

Define a new structure or enumeration.

### Assignment statements

Assign a value to a pattern.

### Expression statements

An expression in statement position.
