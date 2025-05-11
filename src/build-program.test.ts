import process from 'node:process'
import {inspect} from 'node:util'
import {
	afterEach, describe, expect, it, vi,
} from 'vitest'
import {buildProgram} from './build-program.js'

describe.concurrent('bin.ts', () => {
	const runWithInput = async (input: string) => {
		if (Object.getOwnPropertyDescriptor(process.stdout, 'columns')) {
			vi.spyOn(process.stdout, 'columns', 'get').mockReturnValue(80)
		}

		let outStream = ''
		let errorStream = ''
		try {
			await buildProgram(arguments_ => {
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

	const whenGivenInput = (input: string, callback: (stream: {errStream: string; outStream: string}) => void): () => void => async () => {
		expect.hasAssertions()
		callback(await runWithInput(input))
	}

	afterEach(vi.restoreAllMocks)

	it('chooses random character', whenGivenInput('char', out => {
		expect(out.outStream).toMatch(/Random character: .*/)
	}))

	it('chooses random boss', whenGivenInput('boss', out => {
		expect(out.outStream).toMatch(/Random boss: .*/)
	}))

	it('emits help', async ({expect}) => {
		const runResult = await runWithInput('--help')
		expect(runResult.outStream).toMatchInlineSnapshot(`
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
