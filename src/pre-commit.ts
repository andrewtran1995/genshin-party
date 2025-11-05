import process from 'node:process'
import { execaCommand } from 'execa'
import {
	Listr,
	type ListrDefaultRenderer,
	type ListrTask,
	PRESET_TIMER,
} from 'listr2'
import type { EmptyObject } from 'type-fest'

const createTask = ({
	command,
	titleFinished,
	titleInitial,
}: {
	command: string
	titleFinished: string
	titleInitial: string
}): ListrTask<EmptyObject, ListrDefaultRenderer> => ({
	rendererOptions: {
		bottomBar: true,
	},
	async task(_, task) {
		await execaCommand(command, { stdio: 'inherit' })
		task.title = titleFinished
	},
	title: titleInitial,
})

const tasks = new Listr(
	[
		createTask({
			command: 'yarn build',
			titleFinished: 'Compiled successfully!',
			titleInitial: 'Compiling TypeScript files ...',
		}),
		createTask({
			command: 'yarn lint',
			titleFinished: 'Linted successful!',
			titleInitial: 'Linting files ...',
		}),
		createTask({
			command: 'yarn test',
			titleFinished: 'Tests passed!',
			titleInitial: 'Running tests ...',
		}),
		createTask({
			command: 'yarn sort-package-json -c',
			titleFinished: '"package.json" is sorted!',
			titleInitial: 'Checking that "package.json" is sorted ...',
		}),
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
