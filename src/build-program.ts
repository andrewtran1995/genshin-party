import 'dotenv/config'
import { Command } from '@commander-js/extra-typings'
import { pipe } from 'remeda'
import packageJson from '../package.json' with { type: 'json' }
import { addBossCommand } from './commands/boss.js'
import { addCharCommand } from './commands/char.js'

import type { OutputConfiguration } from 'commander'
import { configureHelp, fmtTitle } from './commands/helpers.js'
import { addInteractiveCommand } from './commands/interactive.js'
import { addOrderCommand } from './commands/order.js'

interface CommandContext {
	command: Command
	log: typeof console.log
}

export type CommandModifier = (ctx: CommandContext) => CommandContext

export const buildProgram = ({
	outputConfiguration,
	log = console.log,
}: {
	outputConfiguration?: OutputConfiguration
	log?: typeof console.log
} = {}) => {
	const program = new Command('genshin-party')
		.allowExcessArguments(false)
		.version(packageJson.version)
		.summary('Genshin Impact randomizer')
		.description(
			'Utility for randomly choosing Genshin Impact entities, especially with multiplayer sessions in mind.',
		)
		.addHelpText(
			'after',
			`
${fmtTitle`More Examples:`}
  $ genshin-party interactive   Interactively select a random team.
  $ genshin-party i
  $ genshin-party char -r 4     Get a random four-star character.
  $ genshin-party boss          Select a random weekly boss.`,
		)

	if (outputConfiguration) {
		program.configureOutput(outputConfiguration)
	}

	pipe(
		{ command: program, log },
		configureHelp,
		addInteractiveCommand,
		addCharCommand,
		addBossCommand,
		addOrderCommand,
	)

	program.addHelpText(
		'after',
		`
${fmtTitle`More Examples:`}
  $ genshin-party interactive   Interactively select a random team.
  $ genshin-party i
  $ genshin-party char -r 4     Get a random four-star character.
  $ genshin-party boss          Select a random weekly boss.`,
	)

	return program
}
