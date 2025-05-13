import fs from 'node:fs'
import { posix } from 'node:path'
// biome-ignore lint/nursery/noRestrictedImports: Only importing type.
import type { Character } from 'genshin-db'
import { omit, once, shuffle } from 'remeda'
import type { ArrayValues } from 'type-fest'
import genshinDbPackageJson from '../node_modules/genshin-db/package.json' with {
	type: 'json',
}
import type { Rarity } from './types.js'

const genshinDatabaseVersion = genshinDbPackageJson.version
const cacheDirectory = '.cache'

const getAllChars = once(async () =>
	getCached(`chars.${genshinDatabaseVersion}`, async () => {
		// biome-ignore lint/nursery/noRestrictedImports: Dynamically importing when necessary.
		const genshinDatabase = await import('genshin-db')
		const chars = genshinDatabase.default.characters('names', {
			matchCategories: true,
			verboseCategories: true,
		})
		return chars.map(omit(['cv', 'costs', 'images', 'url']))
	}),
)

export const getAllEnemies = once(async () =>
	getCached(`enemies.${genshinDatabaseVersion}`, async () => {
		// biome-ignore lint/nursery/noRestrictedImports: Dynamically importing when necessary.
		const genshinDatabase = await import('genshin-db')
		const enemies = genshinDatabase.default.enemies('names', {
			matchCategories: true,
			verboseCategories: true,
		})
		return enemies.map(omit(['investigation', 'rewardPreview', 'images']))
	}),
)

export type Enemy = ArrayValues<Awaited<ReturnType<typeof getAllEnemies>>>

async function getCached<T>(
	key: string,
	deriveValue: () => Promise<T>,
): Promise<T> {
	if (!fs.existsSync(cacheDirectory)) {
		fs.mkdirSync(cacheDirectory)
	}

	const path = posix.join(cacheDirectory, key)
	if (!fs.existsSync(path)) {
		const value = await deriveValue()
		fs.writeFileSync(path, JSON.stringify(value))
		return value
	}

	return JSON.parse(fs.readFileSync(path).toString()) as T
}

type GetCharsOptions = { element?: Character['elementType']; rarity?: Rarity }

/**
 * Get all characters in an array given the criteria.
 * Excludes "Aether" to prevent returning two copies of the traveller (both "Aether" and "Lumine").
 * @param filters - Filters to narrow down the eligible characters returned.
 */
export const getChars = async ({ element, rarity }: GetCharsOptions = {}) =>
	(await getAllChars())
		.filter((_) => (rarity ? _.rarity === Number(rarity) : true))
		.filter((_) => (element ? _.elementType === element : true))
		.filter((_) => _.name !== 'Aether')

export type Char = ArrayValues<Awaited<ReturnType<typeof getChars>>>

/**
 * Returns an iterator that steps through characters randomly.
 * The iterator is guaranteed to iterate through all characters that fit the filters
 * before repeating characters.
 * Will iterate infinitely.
 * @param filters - Filters to narrow down the eligible characters returned.
 */
export async function* randomChars(filters: Parameters<typeof getChars>[0]) {
	while (true) {
		const chars = await getChars(filters)
		for (const char of shuffle(chars)) {
			yield char
		}
	}
}
