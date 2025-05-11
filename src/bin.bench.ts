import {beforeAll, bench, describe} from 'vitest'
import {$} from 'execa'

describe('bin', () => {
	beforeAll(async () => {
		await $`yarn build`
		await $`chmod +x dist/bin.js`
	})

	bench('bin', async () => {
		await $`./dist/bin.js`
	})
})
