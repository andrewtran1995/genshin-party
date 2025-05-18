import ansis from 'ansis'
import { $, execa } from 'execa'
import { takeLast, times } from 'remeda'
import { beforeAll, describe, it } from 'vitest'

const REGEX = {
	acceptChar: /.*Accept character.*/,
	playerAssignment: /.*: [a-zA-Z]/,
	randomChar: /Random character: .*/,
}

/**
 * This should probably be an "integration" test due to invoking a build. Keeping it flat
 * with the other unit tests right now for simplicity.
 */
describe.concurrent('bin.ts', () => {
	beforeAll(async () => {
		await $`yarn build`
		await $`chmod +x dist/bin.js`
	})

	it('can run bin', async ({ expect }) => {
		const command = await $`./dist/bin.js`
		expect.soft(command.exitCode).toBe(0)
		expect.soft(command.stdout).toMatch(REGEX.randomChar)
	})

	it('can run in interactive mode', async ({ expect }) => {
		const process = execa('./dist/bin.js', ['interactive'])
		process.stdout?.on('data', (data: string) => {
			if (REGEX.acceptChar.test(data)) {
				process.stdin?.write('\n')
			}
		})
		const { stdout } = await process

		const lastLines = takeLast(stdout.split('\n'), 5).map(ansis.strip)
		expect(lastLines).toEqual([
			'Chosen characters are:',
			...times(4, () => expect.stringMatching(REGEX.playerAssignment)),
		])
	})
})
