import { join, map, pipe, shuffle, tap } from 'remeda'
import type { CommandModifier } from '../build-program.js'
import { formatPlayer } from './helpers.js'

export const addOrderCommand: CommandModifier = tap(({ command, log }) => {
	command
		.command('order')
		.alias('o')
		.description('Generate a random order in which to select characters.')
		.action(() => {
			log(
				pipe(
					[1, 2, 3, 4],
					shuffle(),
					map(_ => formatPlayer(_, undefined)),
					join(', '),
				),
			)
		})
})
