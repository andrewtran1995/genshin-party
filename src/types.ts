import {type Character} from 'genshin-db'

export type PlayerChoice = {
	char: Character;
	isMain: boolean;
	number: number;
}
