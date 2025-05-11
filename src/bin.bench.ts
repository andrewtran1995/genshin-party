import { $ } from 'execa'
import { beforeAll, bench, describe } from 'vitest'

describe('bin', () => {
	beforeAll(async () => {
		await $`yarn build`
		await $`chmod +x dist/bin.js`
	})

	bench('bin', async () => {
		await $`./dist/bin.js`
	})
})
