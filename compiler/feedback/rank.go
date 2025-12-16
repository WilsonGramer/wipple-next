package feedback

import "slices"

type Rank int

const (
	RankSyntax Rank = iota
	RankName
	RankCustom
	RankTypes
	RankBounds
	RankPlaceholder
)

func sortByRank(items []FeedbackItem) {
	slices.SortStableFunc(items, func(left FeedbackItem, right FeedbackItem) int {
		return int(left.Rank) - int(right.Rank)
	})
}
