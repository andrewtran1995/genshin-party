import chalk from 'chalk'
import { match } from 'ts-pattern'
import type { Char } from '../index.js'

export function formatPlayer(
	playerNumber: number,
	playerNames: string[] | undefined,
) {
	return playerNames
		? chalk.italic.rgb(251, 217, 148)(playerNames[playerNumber - 1])
		: chalk.italic(`Player ${chalk.rgb(251, 217, 148)(playerNumber)}`)
}

export const formatChar = (char: Char) =>
	match(char.elementType)
		.with('ELEMENT_ANEMO', () => chalk.rgb(117, 194, 168))
		.with('ELEMENT_CRYO', () => chalk.rgb(160, 215, 228))
		.with('ELEMENT_DENDRO', () => chalk.rgb(165, 200, 56))
		.with('ELEMENT_ELECTRO', () => chalk.rgb(176, 143, 194))
		.with('ELEMENT_GEO', () => chalk.rgb(249, 182, 46))
		.with('ELEMENT_HYDRO', () => chalk.rgb(75, 195, 241))
		.with('ELEMENT_PYRO', () => chalk.rgb(239, 122, 53))
		.otherwise(() => chalk.white)(char.name)
