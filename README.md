# Wipple Next

[![Tests](https://github.com/WilsonGramer/wipple-next/actions/workflows/test.yml/badge.svg)](https://github.com/WilsonGramer/wipple-next/actions/workflows/test.yml)

A new implementation of the [Wipple](https://github.com/wipplelang/wipple) compiler.

## Using the CLI

1.  Create a `test.wipple` file at the top level. All `test*.wipple` files are ignored by Git.

2.  Run the CLI with `npm run dev -- -- compile test.wipple`.

3.  The CLI will output all the facts and feedback collected during compilation. To filter the facts per line, use `-l`, e.g. `npm run dev -- -- compile test.wipple -l 1`. You can use `-l` multiple times.

## Compiler design overview

The compiler is built around a database of _facts_ relating _nodes_ in the program. Each stage (parsing, typechecking) adds new facts to the database, and feedback generation is structured as queries on the database.

### Example: Variables

After the parser produces `VariableExpression` objects in the AST:

1.  `visitVariableExpression` in `src/visit` creates a new `Node` and resolves the variable name from the AST object. If the variable is resolved to a definition, a _constraint_ is added linking the type of the variable to the type of the definition. If the variable cannot be resolved, the `IsUnresolvedVariable` fact is added to the node.

2.  The typechecker uses the added constraint to place the variable reference and its definition in the same _group_ (see below).

3.  Feedback is generated according to the available facts. For example, all nodes with the `IsUnresolvedVariable` fact will produce the `unresolved-variable` error in `src/feedback/items`.

### Typechecking

The key difference between Wipple's new and old typecheckers is that the new one tries to form _groups_ rather than comparing types directly. In more technical terms, types can reference _other nodes_ rather than creating type variables, and the typechecker takes care not to visibly "apply" types containing node references until all constraints have been solved.

The advantage of forming groups instead of comparing types is that Wipple can produce much richer type error messages. For example, this program tries to call the function `f` with two different types of inputs:

```wipple
f : x -> ()
f 3.14
f "abc"
```

In the old typechecker, the error appears on `"abc"`:

```
f "abc"
  ^^^^^
  This code is supposed to be a number, but it's actually a string
```

This is because `x` is first unified with `3.14` (a `Number` value), and then `Number` is unified with `"abc"` (a `String` value). The old typechecker simply reports conflicts at the locations they occur.

The new typechecker works differently — the fact that `3.14` and `"abc"` have types `Number` and `String` respectively is _not_ considered until the end. First, the typechecker places `x` and `3.14` in the same group, and then `"abc"` in this group as well. After all groups have been formed, concrete types are processed. Then, if a group contains multiple different types, an error is reported on the group's representative:

```
f : x -> ()
    ^
    `x` is `String` or `Number`, but it can only be one of these.
    `x` must be the same type as `3.14` and `"abc"`; double-check these.
```

As a consequence of this approach, the typechecker must avoid applying types, even when instantiating generic constants. Instantiation works by cloning _all_ the nodes and constraints involved in the type annotation, so the constraints that form groups with nodes at the use site are considered first. This allows instantiated type parameters to be placed into groups, which is needed for `infer` to work properly. It also allows the relevant portions of type annotations to belong to groups automatically:

```
Add : left right (infer sum) => trait (left right -> sum)

instance (Add Number Number Number) : _

add :: left right -> sum where (Add left right sum)

-- Force the output of `add` to be `String`
show :: String -> ()

show (add 1 2)
```

In that example, the instantiated `sum`, the `Number` from the `Add` instance, and the `String` from `show` are all placed into the same group, resulting in an informative error message.

```
instance (Add Number Number Number) : _
                            ^^^^^^

add :: left right -> sum where (Add left right sum)
                     ^^^

show :: String -> ()
        ^^^^^^

show (add 1 2)
     ^^^^^^^^^
     `add 1 2` is `String` or `Number`, but it can only be one of these.
```

## Progress

| Name                                                                          | Parsing | Visiting | Codegen |
| ----------------------------------------------------------------------------- | ------- | -------- | ------- |
| [`as` expressions](docs/Language.md#as-expressions)                           | ☑️      | ☑️       |         |
| [`do` expressions](docs/Language.md#do-expressions)                           | ☑️      |          |         |
| [`intrinsic` expressions](docs/Language.md#intrinsic-expressions)             | ☑️      |          |         |
| [`is` expressions](docs/Language.md#is-expressions)                           | ☑️      |          |         |
| [`when` expressions](docs/Language.md#when-expressions)                       | ☑️      |          |         |
| [Annotate expressions](docs/Language.md#annotate-expressions)                 | ☑️      | ☑️       |         |
| [Block expressions](docs/Language.md#block-expressions)                       | ☑️      | ☑️       |         |
| [Call expressions](docs/Language.md#call-expressions)                         | ☑️      | ☑️       |         |
| [Collection expressions](docs/Language.md#collection-expressions)             | ☑️      |          |         |
| [Formatted string expressions](docs/Language.md#formatted-string-expressions) | ☑️      |          |         |
| [Function expressions](docs/Language.md#function-expressions)                 | ☑️      | ☑️       |         |
| [Number expressions](docs/Language.md#number-expressions)                     | ☑️      | ☑️       |         |
| [Placeholder expressions](docs/Language.md#placeholder-expressions)           | ☑️      | ☑️       |         |
| [String expressions](docs/Language.md#string-expressions)                     | ☑️      | ☑️       |         |
| [Structure expressions](docs/Language.md#structure-expressions)               | ☑️      |          |         |
| [Trait expressions](docs/Language.md#trait-expressions)                       | ☑️      | ☑️       |         |
| [Tuple expressions](docs/Language.md#tuple-expressions)                       | ☑️      |          |         |
| [Unit expressions](docs/Language.md#unit-expressions)                         | ☑️      | ☑️       |         |
| [Variable expressions](docs/Language.md#variable-expressions)                 | ☑️      | ☑️       |         |
| [`or` patterns](docs/Language.md#or-patterns)                                 | ☑️      |          |         |
| [`set` patterns](docs/Language.md#set-patterns)                               | ☑️      | ☑️       |         |
| [Annotate patterns](docs/Language.md#annotate-patterns)                       | ☑️      | ☑️       |         |
| [Destructure patterns](docs/Language.md#destructure-patterns)                 | ☑️      |          |         |
| [Number patterns](docs/Language.md#number-patterns)                           | ☑️      | ☑️       |         |
| [String patterns](docs/Language.md#string-patterns)                           | ☑️      | ☑️       |         |
| [Tuple patterns](docs/Language.md#tuple-patterns)                             | ☑️      |          |         |
| [Unit patterns](docs/Language.md#unit-patterns)                               | ☑️      | ☑️       |         |
| [Variable patterns](docs/Language.md#variable-patterns)                       | ☑️      | ☑️       |         |
| [Variant patterns](docs/Language.md#variant-patterns)                         | ☑️      |          |         |
| [Wildcard patterns](docs/Language.md#wildcard-patterns)                       | ☑️      | ☑️       |         |
| [Block types](docs/Language.md#block-types)                                   | ☑️      | ☑️       |         |
| [Function types](docs/Language.md#function-types)                             | ☑️      | ☑️       |         |
| [Named types](docs/Language.md#named-types)                                   | ☑️      | ☑️       |         |
| [Parameter types](docs/Language.md#parameter-types)                           | ☑️      | ☑️       |         |
| [Placeholder types](docs/Language.md#placeholder-types)                       | ☑️      | ☑️       |         |
| [Tuple types](docs/Language.md#tuple-types)                                   | ☑️      | ☑️       |         |
| [Unit types](docs/Language.md#unit-types)                                     | ☑️      | ☑️       |         |
| [Bound constraints](docs/Language.md#bound-constraints)                       | ☑️      | ☑️       |         |
| [Default constraints](docs/Language.md#default-constraints)                   | ☑️      | ☑️       |         |
| [Constant definitions](docs/Language.md#constant-definitions)                 | ☑️      | ☑️       |         |
| [Instance definitions](docs/Language.md#instance-definitions)                 | ☑️      | ☑️       |         |
| [Trait definitions](docs/Language.md#trait-definitions)                       | ☑️      | ☑️       |         |
| [Type definitions](docs/Language.md#type-definitions)                         | ☑️      |          |         |
| [Assignment statements](docs/Language.md#assignment-statements)               | ☑️      | ☑️       |         |
| [Expression statements](docs/Language.md#expression-statements)               | ☑️      | ☑️       |         |
