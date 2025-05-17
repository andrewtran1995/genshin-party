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
			rendererOptions: {
				bottomBar: true,
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
		collectErrors: 'minimal',
		concurrent: true,
		exitOnError: false,
		rendererOptions: {
			collapseErrors: false,
			timer: PRESET_TIMER,
		},
	},
)

await tasks.run()
if (tasks.errors.length > 0) {
	process.exit(1)
}
