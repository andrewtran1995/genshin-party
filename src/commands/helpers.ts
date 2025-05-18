import { italic, rgb, white } from 'ansis'
import { match } from 'ts-pattern'
import type { Char } from '../index.js'

export const formatPlayer = (
	playerNumber: number,
	playerNames: string[] | undefined,
) =>
	playerNames
		? italic.rgb(251, 217, 148)(playerNames[playerNumber - 1])
		: italic(`Player ${rgb(251, 217, 148)(playerNumber)}`)

export const formatChar = (char: Char) =>
	match(char.elementType)
		.with('ELEMENT_ANEMO', () => rgb(117, 194, 168))
		.with('ELEMENT_CRYO', () => rgb(160, 215, 228))
		.with('ELEMENT_DENDRO', () => rgb(165, 200, 56))
		.with('ELEMENT_ELECTRO', () => rgb(176, 143, 194))
		.with('ELEMENT_GEO', () => rgb(249, 182, 46))
		.with('ELEMENT_HYDRO', () => rgb(75, 195, 241))
		.with('ELEMENT_PYRO', () => rgb(239, 122, 53))
		.otherwise(() => white)(char.name)
