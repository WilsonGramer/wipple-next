package queries

import (
	"slices"
	"wipple/database"
	"wipple/nodes/statements"
	"wipple/nodes/types"
	"wipple/typecheck"
	"wipple/visit"
)

func ErrorInstance(db *database.Db, node database.Node, filter func(node database.Node) bool, f func(bound typecheck.ResolvedBound, comments CommentsData)) {
	bounds, ok := database.GetFact[typecheck.BoundsFact](node)
	if !ok {
		return
	}

	for _, bound := range bounds {
		if bound.Instance != nil && bound.Error {
			instance, ok := bound.Instance.(*statements.InstanceDefinitionNode)
			if !ok {
				continue
			}

			f(bound.Bound, CommentsData{
				Node:     instance,
				Comments: instance.Comments,
				Links:    getLinks(db, instance, node),
			})
		}
	}
}

type CommentsData struct {
	Node     database.Node
	Comments []string
	Links    map[string]Links
}

func Comments(db *database.Db, node database.Node, filter func(node database.Node) bool, f func(data CommentsData)) {
	if defined, ok := database.GetFact[visit.DefinedFact](node); ok {
		f(CommentsData{
			Node:     node,
			Comments: defined.Definition.GetComments(),
			Links:    getLinks(db, node, node),
		})
	} else if resolved, ok := database.GetFact[visit.ResolvedFact](node); ok && len(resolved.Definitions) == 1 {
		definition := resolved.Definitions[0]

		f(CommentsData{
			Node:     definition.GetNode(),
			Comments: definition.GetComments(),
			Links:    getLinks(db, definition.GetNode(), node),
		})
	}

}

type Links struct {
	Type    typecheck.Type
	Related []database.Node
	Types   []*typecheck.ConstructedType
}

func getLinks(db *database.Db, node database.Node, source database.Node) map[string]Links {
	links := map[string]Links{}

	fact, ok := database.GetFact[visit.TypeParametersFact](node)
	if !ok {
		return links
	}

	for _, typeParameter := range fact {
		typeParameter, ok := typeParameter.(*types.TypeParameterNode)
		if !ok {
			continue
		}

		instantiated, ok := database.ContainsFact(db, func(node database.Node, fact typecheck.InstantiatedFact) (database.Node, bool) {
			if instantiated, ok := database.GetFact[typecheck.InstantiatedFact](node); ok {
				if instantiated.From == typeParameter && instantiated.Source == source {
					return node, true
				}
			}

			return nil, false
		})

		if !ok {
			continue
		}

		fact, ok := database.GetFact[typecheck.TypedFact](instantiated)
		if !ok || fact.Group == nil {
			continue
		}

		var uses []database.Node
		for _, node := range fact.Group.Nodes {
			if node != instantiated {
				if _, ok := database.GetFact[typecheck.TypedFact](node); ok {
					uses = append(uses, node)
				}
			}
		}

		if len(uses) == 0 {
			continue
		}

		slices.SortStableFunc(uses, func(left database.Node, right database.Node) int {
			return OrderGroupNodes(left) - OrderGroupNodes(right)
		})

		links[typeParameter.Name] = Links{
			Type:    uses[0],
			Related: uses,
			Types:   fact.Group.Types,
		}
	}

	return links
}
