import process from 'node:process'
import { inspect } from 'node:util'
import {
	type TestContext,
	type TestFunction,
	afterEach,
	describe,
	it,
	vi,
} from 'vitest'
import { buildProgram } from './build-program.js'

const REGEX = {
	randomBoss: /Random boss: .*/,
	randomChar: /Random character: .*/,
}

describe.concurrent('bin.ts', () => {
	const runWithInput = async (input: string) => {
		if (Object.getOwnPropertyDescriptor(process.stdout, 'columns')) {
			vi.spyOn(process.stdout, 'columns', 'get').mockReturnValue(80)
		}

		let outStream = ''
		let errorStream = ''
		try {
			await buildProgram({
				log: arguments_ => {
					outStream += inspect(arguments_)
				},
				outputConfiguration: {
					writeErr(string_) {
						errorStream += string_
					},
					writeOut(string_) {
						outStream += string_
					},
				},
			})
				.exitOverride()
				.parseAsync(['', '', ...input.split(' ')])
		} catch {
			// Do nothing.
		}

		return {
			errStream: errorStream,
			outStream,
		}
	}

	const whenGivenInput =
		<T extends object>(
			input: string,
			callback: (
				stream: { errStream: string; outStream: string },
				context: TestContext & T,
			) => void,
		): TestFunction<TestContext & T> =>
		async context => {
			context.expect.hasAssertions()
			callback(await runWithInput(input), context)
		}

	afterEach(vi.restoreAllMocks)

	it(
		'chooses random boss',
		whenGivenInput('boss', (out, { expect }) => {
			expect(out.outStream).toMatch(REGEX.randomBoss)
		}),
	)

	it(
		'emits help',
		whenGivenInput('--help', (out, { expect }) => {
			expect(out.outStream).toMatchInlineSnapshot(`
				"Usage: genshin-party [options] [command]

				Options:
				  -V, --version            output the version number
				  -h, --help               display help for command

				Commands:
				  interactive|i [options]  Random, interactive party selection, balancing four
				                           and five star characters.
				  char|c [options]         Select a random character.
				  boss|b [options]         Select a random boss.
				  order|o                  Generate a random order in which to select
				                           characters.
				  help [command]           display help for command

				Examples:
				  $ genshin-party interactive   Interactively select a random team.
				  $ genshin-party i
				  $ genshin-party char -r 4     Get a random four-star character.
				  $ genshin-party boss          Select a random weekly boss.
				"
			`)
		}),
	)

	describe('interactive', () => {
		it(
			'emits help',
			whenGivenInput('interactive --help', (out, { expect }) => {
				expect(out.outStream).toMatchInlineSnapshot(`
					"Usage: genshin-party interactive|i [options]

					Random, interactive party selection, balancing four and five star characters.

					Options:
					  -p, --players <PLAYERS...>  Specify the player names for the party assignments
					                              up to four players. If sourced as an environment
					                              variable, values must be separated by commas
					                              (e.g., \`PLAYERS=BestTraveller,Casper,IttoSimp\`).
					                              (env: PLAYERS)
					  -t, --only-teyvat           Exclude characters not from Teyvat (Traveller,
					                              Aloy). (default: true)
					  -u, --unique                Only select unique characters (no duplicates).
					                              (default: true)
					  -h, --help                  display help for command

					Examples:
					  $ genshin-party interactive -p BestTraveller Casper IttoSimp
					"
				`)
			}),
		)
	})

	describe('char', () => {
		it.only(
			'emits help',
			whenGivenInput('char --help', (out, { expect }) => {
				expect(out.outStream).toMatchInlineSnapshot(`
			"Usage: genshin-party char|c [options]

			Select a random character.

			Options:
			  -l, --list               List all elegible characters. (default: false)
			  -r, --rarity <rarity>    Rarity of the desired character. (choices: "4", "5")
			  -e, --element <element>  Element of the desired character. (choices: "anemo",
			                           "cryo", "dendro", "electro", "geo", "hydro", "none",
			                           "pyro")
			  -h, --help               display help for command
			"
		`)
			}),
		)

		it(
			'chooses random character',
			whenGivenInput('char', (out, { expect }) => {
				expect(out.outStream).toMatch(REGEX.randomChar)
			}),
		)
	})
})
