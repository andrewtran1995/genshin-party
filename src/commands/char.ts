import { Option } from '@commander-js/extra-typings'
import { sample, tap, toUpperCase } from 'remeda'
import type { CommandModifier } from '../build-program.js'
import { getChars } from '../index.js'
import { rarities } from '../types.js'
import { formatChar } from './helpers.js'

const elements = [
	'anemo',
	'cryo',
	'dendro',
	'electro',
	'geo',
	'hydro',
	'none',
	'pyro',
] as const

export const addCharCommand: CommandModifier = tap(({ command, log }) => {
	command
		.command('char', { isDefault: true })
		.alias('c')
		.description('select a random character')
		.option('-l, --list', 'List all elegible characters.', false)
		.addOption(
			new Option(
				'-r, --rarity <rarity>',
				'Rarity of the desired character.',
			).choices(rarities),
		)
		.addOption(
			new Option(
				'-e, --element <element>',
				'Element of the desired character.',
			).choices(elements),
		)
		.action(async ({ element, list, rarity }) => {
			const filteredChars = await getChars({
				element: element ? `ELEMENT_${toUpperCase(element)}` : undefined,
				rarity,
			})

			if (list) {
				log('List of playable characters:')
				log(filteredChars.map(formatChar).join(', '))
				log('')
			}

			const randomChar = sample(filteredChars, 1).at(0)
			if (!randomChar) {
				log('Could not find a character matching criteria.')
				return
			}

			log(`Random character: ${formatChar(randomChar)}`)
		})
})
