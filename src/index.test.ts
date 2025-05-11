import {
	describe, expect, expectTypeOf, it,
} from 'vitest'

describe.concurrent('index.ts', () => {
	it('has expected exports', async () => {
		const exports = await import('./index.js')
		expect(Object.keys(exports)).toHaveLength(5)
		expectTypeOf(exports.createPlayerSelectionStackActor).toBeFunction()
		expectTypeOf(exports.getAllEnemies).toBeFunction()
		expectTypeOf(exports.getChars).toBeFunction()
		expectTypeOf(exports.playerSelectionStack).toBeObject()
		expectTypeOf(exports.randomChars).toBeFunction()
	})
})

