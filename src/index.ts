import process from 'node:process'
import genshindb, {type Character, type Enemy} from 'genshin-db'
import pkg from 'lodash/fp.js'
import {Command, Option} from '@commander-js/extra-typings'
import chalk from 'chalk'
import {type ArrayValues} from 'type-fest'
import select from '@inquirer/select'
import {P, match} from 'ts-pattern'
import 'dotenv/config' // eslint-disable-line import/no-unassigned-import
import {
	InferEvent, assign, createActor, createMachine, log, setup,
} from 'xstate'
import {z} from 'zod'
import {beforeAll} from 'vitest'
import {$} from 'execa'

const {head, initial, last, memoize, pick, range, sample, sampleSize, shuffle, slice} = pkg

const rarities = ['4', '5'] as const
type Rarity = ArrayValues<typeof rarities>

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

type PlayerChoice = {
	char: Char;
	isMain: boolean;
	number: number;
}

export const buildProgram = (log = console.log): Command => {
	const program = new Command('genshin-party')
		.allowExcessArguments(false)

	program
		.command('interactive')
		.alias('i')
		.description('Random, interactive party selection, balancing four and five star characters.')
		.option('--only-teyvat', 'Exclude characters not of Teyvat (Traveller, Aloy).')
		.action(async ({onlyTeyvat}) => {
			const machine = setup({
				actions: {
					push: assign({
						playerChoices: ({context}, choice: PlayerChoice) => [...context.playerChoices, choice],
					}),
					pop: assign({
						playerChoices: ({context}) => initial(context.playerChoices),
					}),
				},
				guards: {
					isFull: ({context}) => context.playerChoices.length === 4,
				},
				types: {
					// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
					context: {} as {
						onNewChoiceFunction?: (playerNumber: number) => void;
						playerChoices: PlayerChoice[];
						playerOrder: number[];
					},
					// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
					events: {} as
						| {type: 'PUSH'; choice: PlayerChoice}
						| {type: 'POP'},
					// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
					input: {} as {
						onNewChoiceFunction: (playerNumber: number) => void;
					},
				},
			}).createMachine({
				initial: 'ready',
				context: ({input: {onNewChoiceFunction}}) => ({
					onNewChoiceFunction,
					playerChoices: [],
					playerOrder: shuffle(range(1, 5)),
				}),
				states: {
					ready: {
						entry: [
							({context}) => {
								context.onNewChoiceFunction?.(context.playerOrder[context.playerChoices.length])
							},
						],
						on: {
							// eslint-disable-next-line @typescript-eslint/naming-convention
							PUSH:
								{
									target: 'checkIfDone',
									actions: {type: 'push', params: ({event}) => event.choice},
								},
							// eslint-disable-next-line @typescript-eslint/naming-convention
							POP:
								{
									target: 'checkIfDone',
									actions: {type: 'pop'},
								},
						},
					},
					checkIfDone: {
						always: [
							{target: 'done', guard: 'isFull'},
							{target: 'ready'},
						],
					},
					done: {
						type: 'final',
					},
				},
			})

			const actor = createActor(machine, {
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

				const rarity = last(playerChoices)?.isMain ?? false
					? '4'
					: '5'
				for (const char of randomChars({rarity})) {
					if (onlyTeyvat && ['Aloy', 'Lumine'].includes(char.name)) {
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
						.with('Accept (and character is a main)', t => ({
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
			log(shuffle([1, 2, 3, 4]))
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
		.action(({gauntlet, list}) => {
			const weeklyBosses = genshindb.enemies('names', {matchCategories: true, verboseCategories: true})
				.filter(_ => _.categoryType === 'CODEX_SUBTYPE_BOSS')
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
  $ genshin-party boss          Select a random weekly boss.
    `)

	return program
}

type Char = ReturnType<typeof getChars>[number]

const getChars = memoize(
	({element, rarity}: {element?: Character['elementType']; rarity?: Rarity}) => genshindb
		.characters('names', {matchCategories: true, verboseCategories: true})
		.map(pick(['elementType', 'name', 'rarity']))
		.filter(_ => rarity ? _.rarity === Number(rarity) : true)
		.filter(_ => element ? _.elementType === element : true)
		.filter(_ => _.name !== 'Aether'),
)

const formatChar = (char: Char): string => {
	const formatFunction = (() => {
		switch (char.elementType) {
			case 'ELEMENT_ANEMO': {
				return chalk.rgb(117, 194, 168)
			}

			case 'ELEMENT_CRYO': {
				return chalk.rgb(160, 215, 228)
			}

			case 'ELEMENT_DENDRO': {
				return chalk.rgb(165, 200, 56)
			}

			case 'ELEMENT_ELECTRO': {
				return chalk.rgb(176, 143, 194)
			}

			case 'ELEMENT_GEO': {
				return chalk.rgb(249, 182, 46)
			}

			case 'ELEMENT_HYDRO': {
				return chalk.rgb(75, 195, 241)
			}

			case 'ELEMENT_PYRO': {
				return chalk.rgb(239, 122, 53)
			}

			default: {
				return chalk.white
			}
		}
	})()

	return formatFunction(char.name)
}

function * randomChars(filters: Parameters<typeof getChars>[0]) {
	while (true) {
		for (const char of shuffle(getChars(filters))) {
			yield char
		}
	}
}

const formatPlayer = (playerNumber: number): string => {
	const parsed = z.string().array().length(4).safeParse(process.env.PLAYERS?.split(','))
	return parsed.success
		? chalk.italic.rgb(251, 217, 148)(parsed.data[playerNumber - 1])
		: chalk.italic(`Player ${chalk.rgb(251, 217, 148)(playerNumber)}`)
}
