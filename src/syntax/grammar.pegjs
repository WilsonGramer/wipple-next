{{
    const buildBinaryExpression = (first, rest, { associativity }) => {
        switch (associativity) {
            case "left": {
                return rest.reduce(
                    (left, { operator, value: right }) => ({
                        type: "binary",
                        location: { start: left.location.start, end: right.location.end },
                        operator,
                        left,
                        right,
                    }),
                    first,
                );
            }
            case "right": {
                return rest.reduceRight(
                    (right, { operator, value: left }) => ({
                        type: "binary",
                        location: { start: left.location.start, end: right.location.end },
                        operator,
                        left,
                        right,
                    }),
                    first,
                );
            }
        }
    };
}}

source_file = _ statements:statements? _ !. { return { location: location(), statements }; }

// Statements

statements = first:statement rest:(__ "\n" _ @statement)* { return [first, ...rest]; }

statement "statement"
    = type_definition_statement
    / trait_definition_statement
    / constant_definition_statement
    / instance_definition_statement
    / assignment_statement
    / expression_statement
    / empty_statement

type_definition_statement
    = comments:comments
        _
        attributes:attribute*
        _
        name:type_name
        _
        ":"
        _
        parameters:type_parameters?
        _
        representation:type_representation {
            return {
                type: "typeDefinition",
                location: location(),
                comments,
                attributes,
                name,
                parameters: parameters ?? [],
                representation,
            };
        }

type_representation
    = structure_type_representation
    / enumeration_type_representation
    / wrapper_type_representation
    / marker_type_representation

structure_type_representation
    = "type" __ "{" _ first:field_definition rest:(__ "\n" _ @field_definition)* _ "}" {
            return { type: "structure", location: location(), fields: [first, ...rest] };
        }

field_definition
    = name:variable_name _ "::" _ type:type { return { location: location(), name, type }; }

enumeration_type_representation
    = "type" __ "{" _ first:variant_definition rest:(__ "\n" _ @variant_definition)* _ "}" {
            return { type: "enumeration", location: location(), variants: [first, ...rest] };
        }

variant_definition
    = name:variant_name elements:(__ @variant_definition_element)* {
            return { location: location(), name, elements };
        }

variant_definition_element = subtype

wrapper_type_representation
    = "type" __ inner:subtype { return { type: "wrapper", location: location(), inner }; }

marker_type_representation = "type" { return { type: "marker", location: location() }; }

trait_definition_statement
    = comments:comments
        _
        attributes:attribute*
        _
        name:type_name
        _
        ":"
        _
        parameters:type_parameters?
        _
        constraints:trait_constraints {
            return {
                type: "traitDefinition",
                location: location(),
                comments,
                attributes,
                name,
                parameters: parameters ?? [],
                constraints,
            };
        }

trait_constraints
    = "trait" __ type:subtype __ constraints:constraints? {
            return { location: location(), type, constraints: constraints ?? [] };
        }

constant_definition_statement
    = comments:comments
        _
        attributes:attribute*
        _
        name:variable_name
        _
        constraints:constant_constraints {
            return {
                type: "constantDefinition",
                location: location(),
                comments,
                attributes,
                name,
                constraints,
            };
        }

constant_constraints
    = "::" __ type:type __ constraints:constraints? {
            return { location: location(), type, constraints: constraints ?? [] };
        }

instance_definition_statement
    = comments:comments
        _
        attributes:attribute*
        _
        constraints:instance_constraints
        _
        ":"
        _
        value:expression {
            return {
                type: "instanceDefinition",
                location: location(),
                comments,
                attributes,
                constraints,
                value,
            };
        }

instance_constraints
    = "instance" __ bound:bound_constraint __ constraints:constraints? {
            return { location: location(), bound, constraints: constraints ?? [] };
        }

assignment_statement
    = comments:comments _ pattern:pattern _ ":" _ value:expression {
            return { type: "assignment", location: location(), comments, pattern, value };
        }

expression_statement
    = comments:comments _ expression:expression {
            return { type: "expression", location: location(), comments, expression };
        }

empty_statement = comments:comments { return { type: "empty", location: location(), comments }; }

comments = @comment*

// Expressions

expression "expression"
    = function_expression
    / tuple_expression
    / collection_expression
    / is_expression
    / as_expression
    / annotate_expression
    / binary_expression

expression_element "expression"
    = formatted_string_expression
    / call_expression
    / do_expression
    / when_expression
    / intrinsic_expression
    / subexpression

subexpression "expression"
    = placeholder_expression
    / variable_expression
    / trait_expression
    / number_expression
    / string_expression
    / structure_expression
    / block_expression
    / unit_expression
    / parenthesized_expression

parenthesized_expression = "(" _ @expression _ ")"

placeholder_expression = "_" { return { type: "placeholder", location: location() }; }

variable_expression
    = variable:variable_name { return { type: "variable", location: location(), variable }; }

trait_expression = trait:type_name { return { type: "trait", location: location(), trait }; }

number_expression = value:number { return { type: "number", location: location(), value }; }

string_expression = value:string { return { type: "string", location: location(), value }; }

structure_expression
    = "{" _ fields:structure_expression_fields _ "}" {
            return { type: "structure", location: location(), fields };
        }

structure_expression_fields
    = first:structure_expression_field rest:(__ "\n" _ @structure_expression_field)* {
            return [first, ...rest];
        }

structure_expression_field
    = name:variable_name _ ":" _ value:expression { return { location: location(), name, value }; }

block_expression
    = "{" _ statements:statements? _ "}" {
            return { type: "block", location: location(), statements: statements ?? [] };
        }

unit_expression = "(" _ ")" { return { type: "unit", location: location() }; }

formatted_string_expression
    = string:string inputs:(__ @subexpression)+ {
            return { type: "formattedString", location: location(), string, inputs };
        }

call_expression
    = func:subexpression inputs:(__ @subexpression)+ {
            return { type: "call", location: location(), function: func, inputs };
        }

do_expression = "do" _ input:subexpression { return { type: "do", location: location(), input }; }

when_expression
    = "when" _ input:subexpression _ "{" _ arms:arms? _ "}" {
            return { type: "when", location: location(), input, arms: arms ?? [] };
        }

arms = first:arm rest:(__ "\n" _ @arm)* { return [first, ...rest]; }

arm
    = pattern:subpattern __ "->" _ value:subexpression {
            return { location: location(), pattern, value };
        }

intrinsic_expression
    = "intrinsic" _ name:string inputs:(_ @subexpression)* {
            return { type: "intrinsic", location: location(), name, inputs };
        }

function_expression
    = inputs:function_expression_inputs _ output:expression {
            return { type: "function", location: location(), inputs, output };
        }

function_expression_inputs
    = first:subpattern rest:(__ @subpattern)* __ "->" { return [first, ...rest]; }

tuple_expression
    = "(" _ ";" _ ")" { return { type: "tuple", location: location(), elements: [] }; }
    / first:expression_element rest:(_ ";" _ @expression_element)+ _ ";"? {
            return { type: "tuple", location: location(), elements: [first, ...rest] };
        }

collection_expression
    = "(" _ "," _ ")" { return { type: "collection", location: location(), elements: [] }; }
    / first:expression_element rest:(_ "," _ @expression_element)+ _ ","? {
            return { type: "collection", location: location(), elements: [first, ...rest] };
        }

is_expression
    = left:expression_element _ "is" _ right:pattern_element {
            return { type: "is", location: location(), left, right };
        }

as_expression
    = left:expression_element _ "as" _ right:type_element {
            return { type: "as", location: location(), left, right };
        }

annotate_expression
    = left:expression_element _ "::" _ right:type_element {
            return { type: "annotate", location: location(), left, right };
        }

binary_expression = apply_expression

apply_expression
    = first:or_expression
        rest:(_ operator:$"." _ value:or_expression { return { operator, value }; })* {
            return buildBinaryExpression(first, rest, { associativity: "left" });
        }

or_expression
    = first:and_expression
        rest:(_ operator:$"or" _ value:and_expression { return { operator, value }; })* {
            return buildBinaryExpression(first, rest, { associativity: "left" });
        }

and_expression
    = first:equal_expression
        rest:(_ operator:$"and" _ value:equal_expression { return { operator, value }; })* {
            return buildBinaryExpression(first, rest, { associativity: "left" });
        }

equal_expression
    = first:compare_expression
        rest:(
            _ operator:$("=" / "/=") _ value:compare_expression { return { operator, value }; }
        )* { return buildBinaryExpression(first, rest, { associativity: "left" }); }

compare_expression
    = first:add_expression
        rest:(
            _ operator:$("<=" / "<" / ">=" / ">") _ value:add_expression {
                    return { operator, value };
                }
        )* { return buildBinaryExpression(first, rest, { associativity: "left" }); }

add_expression
    = first:multiply_expression
        rest:(
            _ operator:$("+" / "-") _ value:multiply_expression { return { operator, value }; }
        )* { return buildBinaryExpression(first, rest, { associativity: "left" }); }

multiply_expression
    = first:power_expression
        rest:(
            _ operator:$("*" / "/" / "%") _ value:power_expression { return { operator, value }; }
        )* { return buildBinaryExpression(first, rest, { associativity: "left" }); }

power_expression
    = first:by_expression
        rest:(_ operator:$"^" _ value:by_expression { return { operator, value }; })* {
            return buildBinaryExpression(first, rest, { associativity: "right" });
        }

by_expression
    = first:to_expression
        rest:(_ operator:$"by" _ value:to_expression { return { operator, value }; })* {
            return buildBinaryExpression(first, rest, { associativity: "left" });
        }

to_expression
    = first:expression_element
        rest:(_ operator:$"to" _ value:expression_element { return { operator, value }; })* {
            return buildBinaryExpression(first, rest, { associativity: "left" });
        }

// Patterns

pattern "pattern"
    = tuple_pattern
    / or_pattern
    / annotate_pattern
    / pattern_element

pattern_element "pattern"
    = set_pattern
    / variant_pattern
    / subpattern

subpattern "pattern"
    = wildcard_pattern
    / variable_pattern
    / number_pattern
    / string_pattern
    / destructure_pattern
    / unit_pattern
    / parenthesized_pattern

parenthesized_pattern = "(" _ p:pattern _ ")" { return p; }

wildcard_pattern = "_" { return { type: "wildcard", location: location() }; }

variable_pattern
    = variable:variable_name { return { type: "variable", location: location(), variable }; }

number_pattern = value:number { return { type: "number", location: location(), value }; }

string_pattern = value:string { return { type: "string", location: location(), value }; }

destructure_pattern
    = "{" _ fields:destructure_pattern_field* _ "}" {
            return { type: "destructure", location: location(), fields };
        }

destructure_pattern_field
    = name:variable_name _ ":" _ value:pattern { return { location: location(), name, value }; }

unit_pattern = "(" _ ")" { return { type: "unit", location: location() }; }

tuple_pattern
    = "(" _ ";" _ ")" { return { type: "tuple", location: location(), elements: [] }; }
    / first:pattern_element rest:(_ ";" _ @pattern_element)+ (_ ";")? {
            return {
                type: "tuple",
                location: location(),
                elements: [first, ...rest],
            };
        }

or_pattern
    = first:pattern_element rest:(_ "or" _ @pattern_element)+ {
            return { type: "or", location: location(), patterns: [first, ...rest] };
        }

annotate_pattern
    = left:pattern_element _ "::" _ right:type_element {
            return { type: "annotate", location: location(), left, right };
        }

set_pattern
    = "set" __ variable:variable_name { return { type: "set", location: location(), variable }; }

variant_pattern
    = variant:variant_name elements:(__ @element:subpattern)* {
            return { type: "variant", location: location(), variant, elements };
        }

// Types

type "type"
    = tuple_type
    / function_type
    / type_element

type_element "type"
    = parameterized_type
    / subtype

subtype "type"
    = placeholder_type
    / parameter_type
    / named_type
    / block_type
    / unit_type
    / parenthesized_type

parenthesized_type = "(" _ @type _ ")"

placeholder_type = "_" { return { type: "placeholder", location: location() }; }

parameter_type
    = name:type_parameter_name { return { type: "parameter", location: location(), name }; }

named_type
    = name:type_name { return { type: "named", location: location(), name, parameters: [] }; }

function_type
    = inputs:function_type_inputs _ output:type {
            return { type: "function", location: location(), inputs, output };
        }

function_type_inputs = first:subtype rest:(__ @subtype)* __ "->" { return [first, ...rest]; }

block_type
    = "{" _ output:type_element _ "}" { return { type: "block", location: location(), output }; }

unit_type = "(" _ ")" { return { type: "unit", location: location() }; }

tuple_type
    = "(" _ ";" _ ")" { return { type: "tuple", location: location(), elements: [] }; }
    / first:type_element _ rest:(";" _ @type_element)+ _ (";" _)? {
            return { type: "tuple", location: location(), elements: [first, ...rest] };
        }

parameterized_type
    = name:type_name parameters:(__ @subtype+) {
            return { type: "named", location: location(), name, parameters };
        }

// Constraints

type_parameters
    = first:type_parameter rest:(__ @type_parameter)* __ "=>" { return [first, ...rest]; }

type_parameter
    = name:type_parameter_name { return { name }; }
    / "(" _ "infer" _ name:type_parameter_name _ ")" { return { name, infer: true }; }

constraints = "where" constraints:(__ @constraint)+ { return constraints; }

constraint "constraint"
    = bound_constraint
    / default_constraint

bound_constraint
    = "(" _ trait:type_name parameters:(_ @subtype)* _ ")" {
            return { type: "bound", location: location(), trait, parameters };
        }

default_constraint
    = "(" _ parameter:type_parameter_name _ ":" _ value:type_element _ ")" {
            return { type: "default", location: location(), parameter, value };
        }

// Attributes

attribute "attribute"
    = "[" _ name:attribute_name _ value:(":" _ @attribute_value)? _ "]" {
            return { location: location(), name, value };
        }

attribute_value = string_attribute_value

string_attribute_value = value:string { return { type: "string", location: location(), value }; }

// Tokens

comment "comment" = "--" value:$(!"\n" .)* "\n"? { return { location: location(), value }; }

string "string"
    = value:("\"" @$(!"\"" .)* "\"" / "'" @$(!"'" .)* "'") {
            return { location: location(), value };
        }

number "number"
    = value:$(("+" / "-")? [0-9]+ ("." [0-9]+)?) { return { location: location(), value }; }

capital_name
    = !(number / keyword) ([0-9] "-")* [A-Z] [A-Za-z0-9_]* ("-" [A-Za-z0-9_]+)* ("!" / "?")?

lowercase_name = !(number / keyword / capital_name) [A-Za-z0-9_]+ ("-" [A-Za-z0-9_]+)* ("!" / "?")?

type_name "type name" = value:$capital_name { return { location: location(), value }; }

variant_name "variant name" = value:$capital_name { return { location: location(), value }; }

variable_name "variable name" = value:$lowercase_name { return { location: location(), value }; }

type_parameter_name "type parameter name"
    = value:$lowercase_name { return { location: location(), value }; }

attribute_name "attribute name"
    = value:$(lowercase_name / keyword) { return { location: location(), value }; }

keyword
    = "do"
    / "infer"
    / "instance"
    / "intrinsic"
    / "set"
    / "trait"
    / "type"
    / "when"
    / "where"
    / "or"
    / "and"
    / "by"
    / "to"
    / "is"
    / "as"

_ "whitespace"
    = comment
    / [ \t\n]*

__ "whitespace" = [ \t]*
