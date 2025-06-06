import { bold, gray, italic } from 'ansis'
import { prop, sample, tap } from 'remeda'
import type { CommandModifier } from '../build-program.js'
import { type Enemy, getAllEnemies } from '../index.js'

export const addBossCommand: CommandModifier = tap(({ command, log }) => {
	command
		.command('boss')
		.alias('b')
		.description('select a random boss')
		.option('-g, --gauntlet', 'select three bosses, per weekly rotation', false)
		.option('-l, --list', 'list all eligible bosses', false)
		.option('--weekly', 'restrict to weekly bosses', true)
		.option('--no-weekly', 'select among all bosses')
		.action(async ({ gauntlet, list, weekly }) => {
			const allEnemies = await getAllEnemies()
			const weeklyBosses = allEnemies
				.filter(
					weekly
						? _ => _.categoryType === 'CODEX_SUBTYPE_BOSS'
						: _ => _.enemyType === 'BOSS',
				)
				.filter(_ => _.name !== 'Stormterror')

			const formatWeeklyBoss = ({ description, name }: Enemy): string =>
				[
					bold.italic(name),
					...description.split('\n').map(_ => gray(`> ${_}`)),
				].join('\n')

			if (list) {
				log('List of bosses:')
				log(
					weeklyBosses
						.map(prop('name'))
						.map(_ => `• ${italic(_)}`)
						.join('\n'),
				)
				log('')
			}

			const output = sample(weeklyBosses, gauntlet ? 3 : 1)
				.map(boss => `Random boss: ${formatWeeklyBoss(boss)}`)
				.join('\n\n')

			log(output)
		})
})
