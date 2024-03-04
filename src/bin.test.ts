import {$} from 'execa'
import {beforeAll, expect, test} from 'vitest'

/**
 * This should probably be an "integration" test due to invoking a build. Keeping it flat
 * with the other unit tests right now for simplicity.
 */

beforeAll(async () => {
	await $`yarn build`
	await $`chmod +x dist/bin.js`
})

// Does not pass in pipeline.
test('can run bin', async () => {
	// eslint-disable-next-line unicorn/no-await-expression-member
	console.log((await $`ls -lrt`).stdout)
	// eslint-disable-next-line unicorn/no-await-expression-member
	console.log((await $`ls dist -lrt`).stdout)
	const command = await $`./dist/bin.js`
	expect.soft(command.exitCode).toBe(0)
	expect.soft(command.stdout).toMatch(/Random character: .*/)
})
