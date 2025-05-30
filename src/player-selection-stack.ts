import { range, shuffle, take } from 'remeda'
import { assign, createActor, setup } from 'xstate'
import type { PlayerChoice } from './types.js'

export const playerSelectionStack = setup({
	actions: {
		push: assign({
			playerChoices: ({ context }, choice: PlayerChoice) => [
				...context.playerChoices,
				choice,
			],
		}),
		pop: assign({
			playerChoices: ({ context }) =>
				take(context.playerChoices, context.playerChoices.length - 1),
		}),
	},
	guards: {
		isFull: ({ context }) => context.playerChoices.length === 4,
	},
	types: {
		context: {} as {
			onNewChoiceFunction?: (playerNumber: number) => void
			playerChoices: PlayerChoice[]
			playerOrder: number[]
		},
		events: {} as { type: 'push'; choice: PlayerChoice } | { type: 'pop' },
		input: {} as {
			onNewChoiceFunction: (playerNumber: number) => void
		},
	},
}).createMachine({
	initial: 'ready',
	context: ({ input: { onNewChoiceFunction } }) => ({
		onNewChoiceFunction,
		playerChoices: [],
		playerOrder: shuffle(range(1, 5)),
	}),
	states: {
		ready: {
			entry: [
				({ context }) => {
					context.onNewChoiceFunction?.(
						context.playerOrder[context.playerChoices.length],
					)
				},
			],
			on: {
				push: {
					target: 'checkIfDone',
					actions: { type: 'push', params: ({ event }) => event.choice },
				},
				pop: {
					target: 'checkIfDone',
					actions: { type: 'pop' },
				},
			},
		},
		checkIfDone: {
			always: [{ target: 'done', guard: 'isFull' }, { target: 'ready' }],
		},
		done: {
			type: 'final',
		},
	},
})

export const createPlayerSelectionStackActor = (
	options: Parameters<typeof createActor<typeof playerSelectionStack>>[1],
) => createActor(playerSelectionStack, options)
