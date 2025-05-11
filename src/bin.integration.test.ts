import {$, execa} from 'execa'
import {takeLast} from 'remeda'
import {
	beforeAll, bench, describe, it,
} from 'vitest'

/**
 * This should probably be an "integration" test due to invoking a build. Keeping it flat
 * with the other unit tests right now for simplicity.
 */

describe.concurrent('bin.ts', () => {
	beforeAll(async () => {
		await $`yarn build`
		await $`chmod +x dist/bin.js`
	})

	it('can run bin', async ({expect}) => {
		const command = await $`./dist/bin.js`
		expect.soft(command.exitCode).toBe(0)
		expect.soft(command.stdout).toMatch(/Random character: .*/)
	})

	it('can run in interactive mode', async ({expect}) => {
		const process = execa('./dist/bin.js', ['interactive'])
		process.stdout?.on('data', (data: string) => {
			if (/.*Accept character.*/.test(data)) {
				process.stdin?.write('\n')
			}
		})
		const {stdout} = await process

		const lastLines = takeLast(stdout.split('\n'), 5)
		expect(lastLines).toEqual([
			'Chosen characters are:',
			expect.stringMatching(/.*: [a-zA-Z]/),
			expect.stringMatching(/.*: [a-zA-Z]/),
			expect.stringMatching(/.*: [a-zA-Z]/),
			expect.stringMatching(/.*: [a-zA-Z]/),
		])
	})
})
