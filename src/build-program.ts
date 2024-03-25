import process from 'node:process'
import chalk from 'chalk'
import genshindb, {type Character, type Enemy} from 'genshin-db'
import pkg from 'lodash/fp.js'
import {match, P} from 'ts-pattern'
import {createActor} from 'xstate'
import 'dotenv/config' // eslint-disable-line import/no-unassigned-import
import {type ArrayValues} from 'type-fest'
import select from '@inquirer/select'
import {Command, Option} from '@commander-js/extra-typings'
import {z} from 'zod'
import {rarities} from './types.js'
import {createPlayerSelectionStackActor, playerSelectionStack} from './player-selection-stack.js'
import {randomChars, getChars} from './index.js'

const {last, shuffle, sample, sampleSize} = pkg

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
type ShorthandElement = ArrayValues<typeof elements>

export const buildProgram = (log = console.log) => {
	const program = new Command('genshin-party')
		.allowExcessArguments(false)

	program
		.command('interactive')
		.alias('i')
		.description('Random, interactive party selection, balancing four and five star characters.')
		.option('--only-teyvat', 'Exclude characters not of Teyvat (Traveller, Aloy).')
		.option('-u, --unique', 'Only select unique characters (no duplicates).')
		.action(async ({onlyTeyvat, unique}) => {
			const actor = createPlayerSelectionStackActor({
				input: {
					onNewChoiceFunction(playerNumber) {
						log(`Now choosing for ${formatPlayer(playerNumber)}.`)
					},
				},
			})
				.start()
			while (actor.getSnapshot().status !== 'done') {
				const {playerChoices, playerOrder} = actor.getSnapshot().context
				const playerNumber = playerOrder[playerChoices.length]

				const rarity = last(playerChoices)?.isMain ? '4' : '5'
				for (const char of randomChars({rarity})) {
					if (onlyTeyvat && ['Aloy', 'Lumine'].includes(char.name)) {
						continue
					}

					if (unique && playerChoices.map(_ => _.char).includes(char)) {
						continue
					}

					log(`Rolled: ${formatChar(char)}`)

					const event = match(
						// eslint-disable-next-line no-await-in-loop
						await select({
							message: 'Accept character?',
							choices: [
								{value: 'Accept'},
								{
									disabled: playerChoices.length === 3 ? '(choosing last character)' : false,
									value: 'Accept (and character is a main)',
								},
								{value: 'Reroll'},
								...(playerChoices.length > 0 ? [{value: `Go back to ${formatPlayer(last(playerChoices)!.number)}`}] : []),
							] as const,
						}),
					)
						.returnType<Parameters<typeof actor.send>[0] | undefined>()
						.with('Accept', () => ({
							type: 'PUSH',
							choice: {
								char,
								isMain: false,
								number: playerNumber,
							},
						}))
						.with('Accept (and character is a main)', () => ({
							type: 'PUSH',
							choice: {
								char,
								isMain: true,
								number: playerNumber,
							},
						}))
						.with(P.string.startsWith('Go back to'), () => ({
							type: 'POP',
						}))
						.otherwise(() => undefined)

					if (event === undefined) {
						continue
					}

					log('')
					actor.send(event)
					break
				}
			}

			log('Chosen characters are:')
			for (const {char, number} of actor.getSnapshot().context.playerChoices
				.toSorted((a, b) => a.number - b.number)) {
				log(`${formatPlayer(number)}: ${formatChar(char)}`)
			}
		})

	program
		.command('order')
		.alias('o')
		.description('Generate a random order in which to select characters.')
		.action(() => {
			log(shuffle([1, 2, 3, 4]).map(_ => formatPlayer(_)).join(', '))
		})

	program
		.command('char', {isDefault: true})
		.alias('c')
		.description('Select a random character.')
		.option('-l, --list', 'List all elegible characters.', false)
		.addOption(new Option('-r, --rarity <rarity>', 'Rarity of the desired character.').choices(rarities))
		.addOption(new Option('-e, --element <element>', 'Element of the desired character.').choices(elements))
		.action(({element, list, rarity}) => {
			const filteredChars = getChars({
				element: element ? `ELEMENT_${element.toUpperCase() as Uppercase<ShorthandElement>}` : undefined,
				rarity,
			})

			if (list) {
				log('Possible characters include:')
				log(filteredChars.map(_ => formatChar(_)).join(', '))
			}

			log(`Random character: ${formatChar(sample(filteredChars)!)}`)
		})

	program
		.command('boss')
		.alias('b')
		.description('Select a random boss.')
		.option('-g, --gauntlet', 'Select three bosses, per weekly rotation.', false)
		.option('-l, --list', 'List all eligible bosses.', false)
		.option('--weekly', 'Restrict to weekly bosses.', true)
		.option('--no-weekly', 'Select among all bosses.')
		.action(({gauntlet, list, weekly}) => {
			const weeklyBosses = genshindb.enemies('names', {matchCategories: true, verboseCategories: true})
				.filter(_ => weekly ? _.categoryType === 'CODEX_SUBTYPE_BOSS' : _.enemyType === 'BOSS')
				.filter(_ => _.name !== 'Stormterror')

			const formatWeeklyBoss = ({description, name}: Enemy): string => [
				chalk.bold.italic(name),
				...description.split('\n')
					.map(_ => chalk.gray(`> ${_}`)),
			]
				.join('\n')

			if (list) {
				log('Possible bosses include:')
				log(weeklyBosses.map(_ => chalk.italic(_.name)).join(', '))
				log('')
			}

			const output = sampleSize(gauntlet ? 3 : 1)(weeklyBosses)
				.map(boss => `Random boss: ${(formatWeeklyBoss(boss))}`)
				.join('\n\n')
			log(output)
		})

	program
		.addHelpText('after', `
Examples:
  $ genshin-party interactive   Interactively select a random team.
  $ genshin-party i
  $ genshin-party char -r 4     Get a random four-star character.
  $ genshin-party boss          Select a random weekly boss.`)

	return program
}

const formatChar = (char: Character) => match(char.elementType)
	.with('ELEMENT_ANEMO', () => chalk.rgb(117, 194, 168))
	.with('ELEMENT_CRYO', () => chalk.rgb(160, 215, 228))
	.with('ELEMENT_DENDRO', () => chalk.rgb(165, 200, 56))
	.with('ELEMENT_ELECTRO', () => chalk.rgb(176, 143, 194))
	.with('ELEMENT_GEO', () => chalk.rgb(249, 182, 46))
	.with('ELEMENT_HYDRO', () => chalk.rgb(75, 195, 241))
	.with('ELEMENT_PYRO', () => chalk.rgb(239, 122, 53))
	.otherwise(() => chalk.white)(char.name)

const playerNames = match(z.string().array().length(4).safeParse(process.env.PLAYERS?.split(',')))
	.with({success: true}, parsed => parsed.data)
	.otherwise(() => undefined)

const formatPlayer = (playerNumber: number) => playerNames
	? chalk.italic.rgb(251, 217, 148)(playerNames[playerNumber - 1])
	: chalk.italic(`Player ${chalk.rgb(251, 217, 148)(playerNumber)}`)
