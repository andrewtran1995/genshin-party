import genshindb, {type Character} from 'genshin-db'
import * as R from 'remeda'
import {type Rarity} from './types.js'

export {createPlayerSelectionStackActor, playerSelectionStack} from './player-selection-stack.js'

const getAllChars = R.once(() => genshindb.characters('names', {matchCategories: true, verboseCategories: true}))

type GetCharsOptions = {element?: Character['elementType']; rarity?: Rarity}

/**
 * Get all characters in an array given the criteria.
 * Excludes "Aether" to prevent returning two copies of the traveller (both "Aether" and "Lumine").
 * @param filters - Filters to narrow down the eligible characters returned.
 */
export const getChars = ({element, rarity}: GetCharsOptions = {}) => getAllChars()
	.filter(_ => rarity ? _.rarity === Number(rarity) : true)
	.filter(_ => element ? _.elementType === element : true)
	.filter(_ => _.name !== 'Aether')

/**
 * Returns an iterator that steps through characters randomly.
 * The iterator is guaranteed to iterate through all characters that fit the filters
 * before repeating characters.
 * Will iterate infinitely.
 * @param filters - Filters to narrow down the eligible characters returned.
 */
export function * randomChars(filters: Parameters<typeof getChars>[0]) {
	while (true) {
		for (const char of R.pipe(filters, getChars, R.shuffle())) {
			yield char
		}
	}
}

