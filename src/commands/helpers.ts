import chalk from 'chalk'

export function formatPlayer(
	playerNumber: number,
	playerNames: string[] | undefined,
) {
	return playerNames
		? chalk.italic.rgb(251, 217, 148)(playerNames[playerNumber - 1])
		: chalk.italic(`Player ${chalk.rgb(251, 217, 148)(playerNumber)}`)
}
