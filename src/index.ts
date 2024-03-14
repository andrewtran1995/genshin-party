import process from 'node:process'
import genshindb, {type Character, type Enemy} from 'genshin-db'
import pkg from 'lodash/fp.js'
import {Command, Option} from '@commander-js/extra-typings'
import chalk from 'chalk'
import {type ArrayValues} from 'type-fest'
import select from '@inquirer/select'
import {match} from 'ts-pattern'
import 'dotenv/config' // eslint-disable-line import/no-unassigned-import

const {last, memoize, pick, range, sample, sampleSize, shuffle} = pkg

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
			const playerChoices: PlayerChoice[] = []

			for (const playerNumber of shuffle(range(1, 5))) {
				log(`Now choosing for ${formatPlayer(playerNumber)}.`)

				const rarity = last(playerChoices)?.isMain ?? false
					? '4'
					: '5'
				for (const char of randomCharacters({rarity})) {
					if (onlyTeyvat && ['Aloy', 'Lumine'].includes(char.name)) {
						continue
					}

					log(`Rolled: ${formatChar(char)}`)

					const choice = match(
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
							] as const,
						}),
					)
						.returnType<PlayerChoice | undefined>()
						.with('Accept', () => ({
							char,
							isMain: false,
							number: playerNumber,
						}))
						.with('Accept (and character is a main)', () => ({
							char,
							isMain: true,
							number: playerNumber,
						}))
						.otherwise(() => undefined)

					if (choice === undefined) {
						continue
					}

					playerChoices.push(choice)
					break
				}

				log('\n')
			}

			log('Chosen characters are:')

			for (const {char, number} of playerChoices
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
				'',
				...description.split('\n')
					.map(_ => chalk.gray(`> ${_}`)),
			]
				.join('\n')

			if (list) {
				log('Possible bosses include:')
				log(weeklyBosses.map(_ => chalk.italic(_.name)).join(', '))
			}

			if (gauntlet) {
				for (const boss of sampleSize(3)(weeklyBosses)) {
					log(`Random boss: ${(formatWeeklyBoss(sample(weeklyBosses)!))}`)
				}
			} else {
				log(`Random boss: ${(formatWeeklyBoss(sample(weeklyBosses)!))}`)
			}
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

function * randomCharacters(filters: Parameters<typeof getChars>[0]) {
	while (true) {
		for (const char of shuffle(getChars(filters))) {
			yield char
		}
	}
}

const formatPlayer = (playerNumber: number): string => {
	const playerNames = process.env.PLAYERS?.split(',')
	return playerNames
		? chalk.italic.rgb(251, 217, 148)(playerNames[playerNumber - 1])
		: chalk.italic(`Player ${chalk.rgb(251, 217, 148)(playerNumber)}`)
}
