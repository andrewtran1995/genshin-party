import process from 'node:process'
import chalk from 'chalk'
import { P, match } from 'ts-pattern'
import 'dotenv/config'
import { Command, Option } from '@commander-js/extra-typings'
import select from '@inquirer/select'
import { type } from 'arktype'
import { identity, join, map, pipe, sample, shuffle } from 'remeda'
import type { ArrayValues } from 'type-fest'
import {
	type Char,
	type Enemy,
	getAllEnemies,
	getChars,
	randomChars,
} from './index.js'
import { createPlayerSelectionStackActor } from './player-selection-stack.js'
import { rarities } from './types.js'

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

const PlayerNames = type('1 <= string[] <= 4')

export const buildProgram = (log = console.log) => {
	const getParsedPlayerNames = (
		rawPlayerNames: string = process.env.PLAYERS ?? '',
	): typeof PlayerNames.infer | undefined => {
		const playerNames = rawPlayerNames
			.split(',')
			.map((_) => _.trim())
			.filter((_) => _.length > 0)
		const parsedNames = match(PlayerNames(playerNames))
			.with(P.instanceOf(type.errors), () => {
				log(chalk.red('Unable to parse player names:', playerNames))
				return undefined
			})
			.otherwise(identity())
		if (!parsedNames) {
			return parsedNames
		}

		return match(parsedNames)
			.with([P._], ([a]) => [a, a, a, a])
			.with([P._, P._], ([a, b]) => [a, a, b, b])
			.with([P._, P._, P._], ([a, b, c]) => [a, a, b, c])
			.otherwise(identity())
	}

	const program = new Command('genshin-party').allowExcessArguments(false)

	program
		.command('interactive')
		.alias('i')
		.description(
			'Random, interactive party selection, balancing four and five star characters.',
		)
		.addOption(
			new Option(
				'-p, --players <PLAYERS...>',
				'Specify the player names for the party assignments up to four players. If sourced as an environment variable, values must be separated by commas (e.g., `PLAYERS=BestTraveller,Casper,IttoSimp`).',
			).env('PLAYERS'),
		)
		.option(
			'-t, --only-teyvat',
			'Exclude characters not from Teyvat (Traveller, Aloy).',
			true,
		)
		.option(
			'-u, --unique',
			'Only select unique characters (no duplicates).',
			true,
		)
		.addHelpText(
			'after',
			`
Examples:
  $ genshin-party interactive -p BestTraveller Casper IttoSimp`,
		)
		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Main for one action, could break up later.
		.action(async ({ onlyTeyvat, players, unique }) => {
			const playerNames = getParsedPlayerNames(
				// If `players` is sourced from an environment variable, the array should be represented by a comma-separated list.
				match(players as typeof players | string)
					.with(P.array(), join(','))
					.with(P.string, identity())
					.with(undefined, identity())
					.exhaustive(),
			)
			const actor = createPlayerSelectionStackActor({
				input: {
					onNewChoiceFunction(playerNumber) {
						log(`Now choosing for ${formatPlayer(playerNumber, playerNames)}.`)
					},
				},
			}).start()
			while (actor.getSnapshot().status !== 'done') {
				const { playerChoices, playerOrder } = actor.getSnapshot().context
				const playerNumber = playerOrder[playerChoices.length]

				const rarity = playerChoices.at(-1)?.isMain ? '4' : '5'
				for await (const char of randomChars({ rarity })) {
					if (onlyTeyvat && ['Aloy', 'Lumine'].includes(char.name)) {
						continue
					}

					if (unique && playerChoices.some((_) => _.char === char)) {
						continue
					}

					log(`Rolled: ${formatChar(char)}`)
					const lastChoice = playerChoices.at(-1)

					const event = match(
						await select({
							message: 'Accept character?',
							choices: [
								{ value: 'Accept' },
								{
									disabled:
										playerChoices.length === 3
											? '(choosing last character)'
											: false,
									value: 'Accept (and character is a main)',
								},
								{ value: 'Reroll' },
								...(lastChoice
									? [
											{
												value: `Go back to ${formatPlayer(lastChoice.number, playerNames)}`,
											},
										]
									: []),
							] as const,
						}),
					)
						.returnType<Parameters<typeof actor.send>[0] | undefined>()
						.with('Accept', () => ({
							type: 'push',
							choice: {
								char,
								isMain: false,
								number: playerNumber,
							},
						}))
						.with('Accept (and character is a main)', () => ({
							type: 'push',
							choice: {
								char,
								isMain: true,
								number: playerNumber,
							},
						}))
						.with(P.string.startsWith('Go back to'), () => ({
							type: 'pop',
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
			for (const { char, number } of actor
				.getSnapshot()
				.context.playerChoices.toSorted((a, b) => a.number - b.number)) {
				log(`${formatPlayer(number, playerNames)}: ${formatChar(char)}`)
			}
		})

	program
		.command('order')
		.alias('o')
		.description('Generate a random order in which to select characters.')
		.action(() => {
			log(
				pipe(
					[1, 2, 3, 4],
					shuffle(),
					map((_) => formatPlayer(_, undefined)),
					join(', '),
				),
			)
		})

	program
		.command('char', { isDefault: true })
		.alias('c')
		.description('Select a random character.')
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
				element: element
					? `ELEMENT_${element.toUpperCase() as Uppercase<ShorthandElement>}`
					: undefined,
				rarity,
			})

			if (list) {
				log('Possible characters include:')
				log(filteredChars.map(formatChar).join(', '))
			}

			const randomChar = sample(filteredChars, 1).at(0)
			if (!randomChar) {
				log('Could not find a character matching criteria.')
				return
			}

			log(`Random character: ${formatChar(randomChar)}`)
		})

	program
		.command('boss')
		.alias('b')
		.description('Select a random boss.')
		.option(
			'-g, --gauntlet',
			'Select three bosses, per weekly rotation.',
			false,
		)
		.option('-l, --list', 'List all eligible bosses.', false)
		.option('--weekly', 'Restrict to weekly bosses.', true)
		.option('--no-weekly', 'Select among all bosses.')
		.action(async ({ gauntlet, list, weekly }) => {
			const allEnemies = await getAllEnemies()
			const weeklyBosses = allEnemies
				.filter((_) =>
					weekly
						? _.categoryType === 'CODEX_SUBTYPE_BOSS'
						: _.enemyType === 'BOSS',
				)
				.filter((_) => _.name !== 'Stormterror')

			const formatWeeklyBoss = ({ description, name }: Enemy): string =>
				[
					chalk.bold.italic(name),
					...description.split('\n').map((_) => chalk.gray(`> ${_}`)),
				].join('\n')

			if (list) {
				log('Possible bosses include:')
				log(weeklyBosses.map((_) => chalk.italic(_.name)).join(', '))
				log('')
			}

			const output = sample(weeklyBosses, gauntlet ? 3 : 1)
				.map((boss) => `Random boss: ${formatWeeklyBoss(boss)}`)
				.join('\n\n')

			log(output)
		})

	program.addHelpText(
		'after',
		`
Examples:
  $ genshin-party interactive   Interactively select a random team.
  $ genshin-party i
  $ genshin-party char -r 4     Get a random four-star character.
  $ genshin-party boss          Select a random weekly boss.`,
	)

	return program
}

const formatChar = (char: Char) =>
	match(char.elementType)
		.with('ELEMENT_ANEMO', () => chalk.rgb(117, 194, 168))
		.with('ELEMENT_CRYO', () => chalk.rgb(160, 215, 228))
		.with('ELEMENT_DENDRO', () => chalk.rgb(165, 200, 56))
		.with('ELEMENT_ELECTRO', () => chalk.rgb(176, 143, 194))
		.with('ELEMENT_GEO', () => chalk.rgb(249, 182, 46))
		.with('ELEMENT_HYDRO', () => chalk.rgb(75, 195, 241))
		.with('ELEMENT_PYRO', () => chalk.rgb(239, 122, 53))
		.otherwise(() => chalk.white)(char.name)

const formatPlayer = (
	playerNumber: number,
	playerNames: string[] | undefined,
) =>
	playerNames
		? chalk.italic.rgb(251, 217, 148)(playerNames[playerNumber - 1])
		: chalk.italic(`Player ${chalk.rgb(251, 217, 148)(playerNumber)}`)
