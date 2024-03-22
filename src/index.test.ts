import {inspect} from 'node:util'
import {
	describe, expect, expectTypeOf, it,
} from 'vitest'
import {StateMachine} from 'xstate'
import {buildProgram} from './index.js'

describe.concurrent('index.ts', () => {
	const runWithInput = (input: string) => {
		let outStream = ''
		let errorStream = ''
		try {
			buildProgram(arguments_ => {
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
				.parse(['', '', ...input.split(' ')])
		} catch {
			// Do nothing.
		}

		return {
			errStream: errorStream,
			outStream,
		}
	}

	const whenGivenInput = (input: string, callback: (stream: {errStream: string; outStream: string}) => void): () => void => async () => {
		expect.hasAssertions()
		callback(runWithInput(input))
	}

	it('has expected exports', async () => {
		const exports = await import('./index.js')
		expect(Object.keys(exports)).toHaveLength(4)
		expectTypeOf(exports.buildProgram).toBeFunction()
		expectTypeOf(exports.getChars).toBeFunction()
		expectTypeOf(exports.playerSelectionStack).toBeObject()
		expectTypeOf(exports.randomChars).toBeFunction()
	})

	it('chooses random character', whenGivenInput('char', out => {
		expect(out.outStream).toMatch(/Random character: .*/)
	}))

	it('chooses random boss', whenGivenInput('boss', out => {
		expect(out.outStream).toMatch(/Random boss: .*/)
	}))

	it('emits help', ({expect}) => {
		expect(runWithInput('--help').outStream).toMatchInlineSnapshot(`
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
	})
})

