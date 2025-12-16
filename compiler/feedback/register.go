package feedback

import (
	"wipple/database"
)

type FeedbackItem struct {
	Id     string
	On     database.Node
	String func() string
}

type Feedback[T any] struct {
	Id     string
	Query  func(db *database.Db, node database.Node, filter func(node database.Node) bool, f func(data T))
	On     func(data T) database.Node // defaults to the queried node
	Render func(render *Render, node database.Node, data T)
}

var registered = []func(db *database.Db, node database.Node, filter func(node database.Node) bool, f func(item FeedbackItem)){}

func register[T any](entry Feedback[T]) {
	registered = append(registered, func(db *database.Db, node database.Node, filter func(node database.Node) bool, f func(item FeedbackItem)) {
		entry.Query(db, node, filter, func(data T) {
			var on database.Node
			if entry.On != nil {
				on = entry.On(data)
			}
			if on == nil {
				on = node
			}

			f(FeedbackItem{
				Id: entry.Id,
				On: on,
				String: func() string {
					render := NewRender(db)
					entry.Render(render, on, data)
					return render.Finish()
				},
			})
		})
	})
}

func init() {
	registerAttributes()
	registerBounds()
	registerConstants()
	registerFormat()
	registerInstances()
	registerNames()
	registerPatterns()
	registerStructures()
	registerSyntax()
	registerTypeDefinitions()
	registerTypes()
}

func Collect(db *database.Db, filter func(node database.Node) bool, f func(item FeedbackItem)) {
	database.ContainsNode(db, func(node database.Node) bool {
		if filter(node) {
			for _, run := range registered {
				run(db, node, filter, f)
			}
		}

		return false
	})
}
