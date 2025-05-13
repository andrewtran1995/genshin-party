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
			await buildProgram((arguments_) => {
				outStream += inspect(arguments_)
			})
				.exitOverride()
				.configureOutput({
					writeErr(string_) {
						errorStream += string_
					},
					writeOut(string_) {
						outStream += string_
					},
				})
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
		async (context) => {
			context.expect.hasAssertions()
			callback(await runWithInput(input), context)
		}

	afterEach(vi.restoreAllMocks)

	it(
		'chooses random character',
		whenGivenInput('char', (out, { expect }) => {
			expect(out.outStream).toMatch(REGEX.randomChar)
		}),
	)

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
			  -h, --help               display help for command

			Commands:
			  interactive|i [options]  Random, interactive party selection, balancing four
			                           and five star characters.
			  order|o                  Generate a random order in which to select
			                           characters.
			  char|c [options]         Select a random character.
			  boss|b [options]         Select a random boss.
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

	it(
		'emits help for command "interactive"',
		whenGivenInput('interactive --help', (out, { expect }) => {
			expect(out.outStream).toMatchInlineSnapshot(`
				"Usage: genshin-party interactive|i [options]

				Random, interactive party selection, balancing four and five star characters.

				Options:
				  -p, --players <PLAYERS>  Specify the player names for the party assignments,
				                           separated by commas (e.g.,
				                           "BestTraveller,Casper,IttoSimp").
				  -t, --only-teyvat        Exclude characters not from Teyvat (Traveller, Aloy).
				                           (default: true)
				  -u, --unique             Only select unique characters (no duplicates).
				                           (default: true)
				  -h, --help               display help for command
				"
			`)
		}),
	)

	it(
		'emits help for command "char"',
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
})
