import 'dotenv/config'
import { Command } from '@commander-js/extra-typings'
import { pipe } from 'remeda'
import { addBossCommand } from './commands/boss.js'
import { addCharCommand } from './commands/char.js'

import { addOrderCommand } from './commands/order.js'

import { addInteractiveCommand } from './commands/interactive.js'

interface CommandContext {
	command: Command
	log: typeof console.log
}

export type CommandModifier = (ctx: CommandContext) => CommandContext

export const buildProgram = (log = console.log) => {
	const program = new Command('genshin-party').allowExcessArguments(false)

	pipe(
		{ command: program, log },
		addInteractiveCommand,
		addCharCommand,
		addBossCommand,
		addOrderCommand,
	)

	program.addHelpText(
		'after',
		`
Examples:
  $ genshin-party interactive   Interactively select a random team.
  $ genshin-party i
  $ genshin-party char -r 4     Get a random four-star character.
  $ genshin-party boss          Select a random weekly boss.`,
	)

	return program
}
