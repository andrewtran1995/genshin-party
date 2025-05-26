import { Option } from '@commander-js/extra-typings'
import select from '@inquirer/select'
import { red } from 'ansis'
import { type } from 'arktype'
import { identity, join, tap } from 'remeda'
import { P, match } from 'ts-pattern'
import type { CommandModifier } from '../build-program.js'
import { randomChars } from '../index.js'
import { createPlayerSelectionStackActor } from '../player-selection-stack.js'
import { formatChar, formatPlayer } from './helpers.js'

const PlayerNames = type('1 <= string[] <= 4')

export const addInteractiveCommand: CommandModifier = tap(
	({ command, log }) => {
		const getParsedPlayerNames = (
			rawPlayerNames: string = process.env.PLAYERS ?? '',
		): typeof PlayerNames.infer | undefined => {
			const playerNames = rawPlayerNames
				.split(',')
				.map(_ => _.trim())
				.filter(_ => _.length > 0)
			const parsedNames = match(PlayerNames(playerNames))
				.with(P.instanceOf(type.errors), () => {
					log(red(`Unable to parse player names: ${playerNames}`))
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

		command
			.command('interactive')
			.alias('i')
			.description(
				'Rrndom, interactive party selection, balancing four and five star characters',
			)
			.addOption(
				new Option(
					'-p, --players <PLAYERS...>',
					'Specify the player names for the party assignments up to four players. If sourced as an environment variable, values must be separated by commas (e.g., `PLAYERS=BestTraveller,Casper,IttoSimp`).',
				).env('PLAYERS'),
			)
			.option(
				'-t, --only-teyvat',
				'exclude characters not from Teyvat (i.e., Traveller, Aloy)',
				true,
			)
			.option(
				'-u, --unique',
				'only select unique characters (no duplicates)',
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
							log(
								`Now choosing for ${formatPlayer(playerNumber, playerNames)}.`,
							)
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

						if (unique && playerChoices.some(_ => _.char === char)) {
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
	},
)
