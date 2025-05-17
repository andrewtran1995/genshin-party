import { $ } from 'execa'
import { Listr, PRESET_TIMER } from 'listr2'

const tasks = new Listr(
	[
		{
			title: 'Compiling ...',
			async task(_, task) {
				await $({ stdio: 'inherit' })`yarn build`
				task.title = 'Compiled successfully!'
			},
		},
		{
			title: 'Linting ...',
			async task(_, task) {
				await $({ stdio: 'inherit' })`yarn lint`
				task.title = 'Linted successful!'
			},
			rendererOptions: {
				bottomBar: true,
			},
		},
		{
			title: 'Testing ...',
			async task(_, task) {
				await $({ stdio: 'inherit' })`yarn test`
				task.title = 'Tests passed!'
			},
			rendererOptions: {
				bottomBar: true,
			},
		},
		{
			title: 'Checking that "package.json" is sorted ...',
			async task(_, task) {
				await $({
					stdio: 'inherit',
				})`yarn sort-package-json -c`
				task.title = `"package.json" is sorted!`
			},
			rendererOptions: {
				bottomBar: true,
			},
		},
	],
	{
		concurrent: true,
		exitOnError: false,
		rendererOptions: {
			collapseErrors: false,
			timer: PRESET_TIMER,
		},
	},
)

try {
	await tasks.run()
} catch (_err) {
	// biome-ignore lint/suspicious/noConsole: Development log.
	console.info('Ran into an issue during pre-commit check!')
}
