import { describe, expect, expectTypeOf, it } from 'vitest'

describe.concurrent('index.ts', () => {
	it('has expected exports', async () => {
		const exports = await import('./index.js')
		expect(Object.keys(exports)).toHaveLength(3)
		expectTypeOf(exports.getAllEnemies).toBeFunction()
		expectTypeOf(exports.getChars).toBeFunction()
		expectTypeOf(exports.randomChars).toBeFunction()
	})
})
