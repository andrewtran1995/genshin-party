import type { ArrayValues } from 'type-fest'
import type { Char } from './index.js'

export const rarities = ['4', '5'] as const
export type Rarity = ArrayValues<typeof rarities>

export type PlayerChoice = {
	char: Char
	isMain: boolean
	number: number
}
