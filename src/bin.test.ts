import {$} from 'execa'
import {beforeAll, expect, test} from 'vitest'

/**
 * This should probably be an "integration" test due to invoking a build. Keeping it flat
 * with the other unit tests right now for simplicity.
 */

beforeAll(() => {
	// eslint-disable-next-line @typescript-eslint/no-unused-expressions
	$`yarn build`
})

test('can run bin', async () => {
	// eslint-disable-next-line unicorn/no-await-expression-member
	console.log((await $`ls`).stdout)
	// eslint-disable-next-line unicorn/no-await-expression-member
	console.log((await $`ls dist`).stdout)
	const command = await $`./dist/bin.js`
	expect.soft(command.exitCode).toBe(0)
	expect.soft(command.stdout).toMatch(/Random character: .*/)
})
