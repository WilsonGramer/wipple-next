package database

import (
	"fmt"
	"strings"
)

type Span struct {
	Path   string
	Start  Location
	End    Location
	Source string
}

type Location struct {
	Line   int
	Column int
	Index  int
}

func JoinSpans(left Span, right Span, source string) Span {
	return Span{
		Path:   left.Path,
		Start:  left.Start,
		End:    right.End,
		Source: source[left.Start.Index:right.End.Index],
	}
}

func CompareSpans(left Span, right Span) int {
	if left.Path != right.Path {
		return strings.Compare(left.Path, right.Path)
	}

	if left.Start.Index != right.Start.Index {
		return left.Start.Index - right.Start.Index
	}

	if left.End.Index != right.End.Index {
		return left.End.Index - right.End.Index
	}

	return 0
}

func SpansAreEqual(left Span, right Span) bool {
	return CompareSpans(left, right) == 0
}

func HaveEqualSpans(left Node, right Node) bool {
	return SpansAreEqual(GetSpanFact(left), GetSpanFact(right))
}

func (span Span) String() string {
	return fmt.Sprintf("%s:%d:%d", span.Path, span.Start.Line, span.Start.Column)
}

func NullSpan() Span {
	return Span{
		Path:   "",
		Start:  NullLocation(),
		End:    NullLocation(),
		Source: "",
	}
}

func NullLocation() Location {
	return Location{
		Line:   1,
		Column: 1,
		Index:  0,
	}
}
