import { $ } from 'execa'
import { beforeAll, describe, test } from 'vitest'

describe('bin', () => {
	beforeAll(async () => {
		await $`yarn build`
		await $`chmod +x dist/bin.js`
	})

	test('bin', async ({ bench }) => {
		await bench('bin', async () => {
			await $`./dist/bin.js`
		}).run()
	})
})
