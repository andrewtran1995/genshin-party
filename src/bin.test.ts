import {$, execa} from 'execa'
import {range} from 'lodash'
import {takeRight} from 'lodash/fp.js'
import {beforeAll, expect, test} from 'vitest'

/**
 * This should probably be an "integration" test due to invoking a build. Keeping it flat
 * with the other unit tests right now for simplicity.
 */

beforeAll(async () => {
	await $`yarn build`
	await $`chmod +x dist/bin.js`
})

test('can run bin', async () => {
	const command = await $`./dist/bin.js`
	expect.soft(command.exitCode).toBe(0)
	expect.soft(command.stdout).toMatch(/Random character: .*/)
})

test('can run in interactive mode', async () => {
	const process = execa('./dist/bin.js', ['interactive'])
	process.stdout?.on('data', (data: string) => {
		if (/.*Accept character.*/.test(data)) {
			process.stdin?.write('\n')
		}
	})
	const {stdout} = await process
	const lastLines = takeRight(5)(stdout.split('\n'))
	const wantMatches = [
		'Chosen characters are:',
		/.*: [a-zA-Z]/,
		/.*: [a-zA-Z]/,
		/.*: [a-zA-Z]/,
		/.*: [a-zA-Z]/,
	]

	for (const i of range(0, 5)) {
		expect(lastLines[i]).toMatch(wantMatches[i])
	}
})
