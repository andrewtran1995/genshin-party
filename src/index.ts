import genshindb, {type Character} from 'genshin-db'
import pkg from 'lodash/fp.js'
import {type Rarity} from './types.js'

export {playerSelectionStack} from './player-selection-stack.js'

const {memoize, shuffle} = pkg

const getCharsUnmemoized = ({element, rarity}: {element?: Character['elementType']; rarity?: Rarity}) => genshindb
	.characters('names', {matchCategories: true, verboseCategories: true})
	.filter(_ => rarity ? _.rarity === Number(rarity) : true)
	.filter(_ => element ? _.elementType === element : true)
	.filter(_ => _.name !== 'Aether')

/**
 * Get all characters in an array given the criteria.
 * Excludes "Aether" to prevent returning two copies of the traveller (both "Aether" and "Lumine").
 * @param filters - Filters to narrow down the eligible characters returned.
 */
export const getChars = memoize(getCharsUnmemoized) as typeof getCharsUnmemoized

/**
 * Returns an iterator that steps through characters randomly.
 * The iterator is guaranteed to iterate through all characters that fit the filters
 * before repeating characters.
 * Will iterate infinitely.
 * @param filters - Filters to narrow down the eligible characters returned.
 */
export function * randomChars(filters: Parameters<typeof getChars>[0]) {
	while (true) {
		for (const char of shuffle(getChars(filters))) {
			yield char
		}
	}
}

