package queries

import (
	"wipple/database"
	"wipple/visit"
)

func Unresolved(db *database.Db, node database.Node, filter func(node database.Node) bool, f func(name string)) {
	fact, ok := database.GetFact[visit.ResolvedFact](node)
	if !ok {
		return
	}

	if len(fact.Definitions) == 0 {
		f(fact.Name)
	}
}

func Ambiguous(db *database.Db, node database.Node, filter func(node database.Node) bool, f func(name string)) {
	fact, ok := database.GetFact[visit.ResolvedFact](node)
	if !ok {
		return
	}

	if len(fact.Definitions) > 1 {
		f(fact.Name)
	}
}
