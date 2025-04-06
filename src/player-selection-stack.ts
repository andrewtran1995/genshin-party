import {
	setup, assign, createActor,
} from 'xstate'
import {range, shuffle, take} from 'remeda'
import {type PlayerChoice} from './types.js'

export const playerSelectionStack = setup({
	actions: {
		push: assign({
			playerChoices: ({context}, choice: PlayerChoice) => [...context.playerChoices, choice],
		}),
		pop: assign({
			playerChoices: ({context}) => take(context.playerChoices, context.playerChoices.length - 1),
		}),
	},
	guards: {
		isFull: ({context}) => context.playerChoices.length === 4,
	},
	types: {
		// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
		context: {} as {
			onNewChoiceFunction?: (playerNumber: number) => void;
			playerChoices: PlayerChoice[];
			playerOrder: number[];
		},
		// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
		events: {} as
			| {type: 'PUSH'; choice: PlayerChoice}
			| {type: 'POP'},
		// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
		input: {} as {
			onNewChoiceFunction: (playerNumber: number) => void;
		},
	},
}).createMachine({
	initial: 'ready',
	context: ({input: {onNewChoiceFunction}}) => ({
		onNewChoiceFunction,
		playerChoices: [],
		playerOrder: shuffle(range(1, 5)),
	}),
	states: {
		ready: {
			entry: [
				({context}) => {
					context.onNewChoiceFunction?.(context.playerOrder[context.playerChoices.length])
				},
			],
			on: {
				// eslint-disable-next-line @typescript-eslint/naming-convention
				PUSH:
					{
						target: 'checkIfDone',
						actions: {type: 'push', params: ({event}) => event.choice},
					},
				// eslint-disable-next-line @typescript-eslint/naming-convention
				POP:
					{
						target: 'checkIfDone',
						actions: {type: 'pop'},
					},
			},
		},
		checkIfDone: {
			always: [
				{target: 'done', guard: 'isFull'},
				{target: 'ready'},
			],
		},
		done: {
			type: 'final',
		},
	},
})

export const createPlayerSelectionStackActor = (options: Parameters<typeof createActor<typeof playerSelectionStack>>[1]) =>
	createActor(playerSelectionStack, options)
