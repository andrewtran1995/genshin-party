import {type Character} from 'genshin-db'
import {type ArrayValues} from 'type-fest'

export const rarities = ['4', '5'] as const
export type Rarity = ArrayValues<typeof rarities>

export type PlayerChoice = {
	char: Character;
	isMain: boolean;
	number: number;
}
