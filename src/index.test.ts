import {inspect} from 'node:util'
import {expect, test} from 'vitest'
import {buildProgram} from './index.js'

const whenGivenInput = (input: string, callback: (stream: {errStream: string; outStream: string}) => void): () => void => async () => {
	expect.hasAssertions()

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

	callback({
		outStream,
		errStream: errorStream,
	})
}

test('chooses random character', whenGivenInput('char', out => {
	expect(out.outStream).toMatch(/Random character: .*/)
}))

test('chooses random boss', whenGivenInput('boss', out => {
	expect(out.outStream).toMatch(/Random boss: .*/)
}))

test('emits help', whenGivenInput('--help', ({outStream}) => {
	expect(outStream).toBe(`Usage: genshin-party [options] [command]

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
    
`)
}))
