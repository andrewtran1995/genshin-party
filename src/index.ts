import genshindb, { type Enemy } from 'genshin-db'
import pkg from 'lodash/fp.js'
import { Option, program } from '@commander-js/extra-typings'
import chalk from 'chalk'
import { type ArrayValues } from 'type-fest'
import select from '@inquirer/select'
import { match } from 'ts-pattern'
const { last, memoize, pick, range, sample, shuffle } = pkg

const Rarities = ['4', '5'] as const
type Rarity = ArrayValues<typeof Rarities>
interface PlayerChoice {
  char: Char
  isMain: boolean
  number: number
}

function main (): void {
  program
    .command('interactive')
    .alias('i')
    .description('Random, interactive party selection, balancing four and five star characters.')
    .option('--only-teyvat', 'Exclude characters not of Teyvat (Traveller, Aloy).')
    .action(async ({ onlyTeyvat }) => {
      const playerChoices: PlayerChoice[] = []

      for (const playerNumber of shuffle(range(1, 5))) {
        console.log(`Now choosing for ${formatPlayer(playerNumber)}.`)

        while (true) {
          const chars = getChars(
            last(playerChoices)?.isMain ?? false
              ? '4'
              : '5'
          )
          const char = sample(
            onlyTeyvat
              ? chars.filter(_ => !['Aloy', 'Lumine'].includes(_.name))
              : chars
          ) as Char
          console.log(`Rolled: ${formatChar(char)}.`)

          const choice = match(
            await select({
              message: 'Accept character?',
              choices: [
                { value: 'Accept' },
                {
                  disabled: playerChoices.length === 3 ? '(choosing last character)' : false,
                  value: 'Accept (and character is a main)'
                },
                { value: 'Reroll' }
              ] as const
            })
          )
            .returnType<PlayerChoice | null>()
            .with('Accept', () => ({
              char,
              isMain: false,
              number: playerNumber
            }))
            .with('Accept (and character is a main)', () => ({
              char,
              isMain: true,
              number: playerNumber
            }))
            .otherwise(() => null)

          if (choice == null) {
            continue
          }

          playerChoices.push(choice)
          break
        }

        console.log('\n')
      }

      console.log('Chosen characters are:')

      playerChoices
        .toSorted((a, b) => a.number - b.number)
        .forEach(({ char, number }) => {
          console.log(`${formatPlayer(number)}: ${formatChar(char)}`)
        })
    })

  program
    .command('order')
    .alias('o')
    .description('Generate a random order in which to select characters.')
    .action(() => {
      console.log(shuffle([1, 2, 3, 4]))
    })

  program
    .command('char', { isDefault: true })
    .alias('c')
    .description('Select a random character.')
    .option('-l, --list', 'List all elegible characters.', false)
    .addOption(new Option('-r, --rarity <rarity>', 'Rarity of the desired character.').choices(Rarities))
    .action(({ list, rarity }) => {
      const filteredChars = getChars(rarity)

      if (list) {
        console.log('Possible characters include:')
        console.log(filteredChars.map(formatChar).join(', '))
      }

      console.log(`Random character: ${formatChar(sample(filteredChars) as Char)}`)
    })

  program
    .command('boss')
    .alias('b')
    .description('Select a random boss.')
    .option('-l, --list', 'List all eligible bosses.', false)
    .action(({ list }) => {
      const weeklyBosses = genshindb.enemies('names', { matchCategories: true, verboseCategories: true })
        .filter(_ => _.categoryType === 'CODEX_SUBTYPE_BOSS')
        .filter(_ => _.name !== 'Stormterror')

      const formatWeeklyBoss = ({ description, name }: Enemy): string => [
        chalk.bold.italic(name),
        '',
        ...description.split('\n')
          .map(_ => chalk.gray(`> ${_}`))
      ]
        .join('\n')

      if (list) {
        console.log('Possible bosses include:')
        console.log(weeklyBosses.map(_ => chalk.italic(_.name)).join(', '))
      }

      console.log(`Random boss: ${(formatWeeklyBoss(sample(weeklyBosses) as Enemy))}`)
    })

  program
    .name('genshin-party')
    .addHelpText('after', `
Examples:
  $ genshin-party interactive   Interactively select a random team.
  $ genshin-party i
  $ genshin-party char -r 4     Get a random four-star character.
  $ genshin-party boss          Select a random weekly boss.
    `)
    .parse()
}

type Char = ReturnType<typeof getChars>[number]

const getChars = memoize(
  (rarity?: Rarity) => genshindb
    .characters('names', { matchCategories: true, verboseCategories: true })
    .map(pick(['elementType', 'name', 'rarity']))
    .filter(_ => {
      switch (rarity) {
        case '4':
        case '5':
          return _.rarity === Number(rarity)
        default:
          return true
      }
    })
    .filter(_ => _.name !== 'Aether')
)

const formatChar = (char: Char): string => {
  const formatFunction = (() => {
    switch (char.elementType) {
      case 'ELEMENT_ANEMO':
        return chalk.rgb(117, 194, 168)
      case 'ELEMENT_CRYO':
        return chalk.rgb(160, 215, 228)
      case 'ELEMENT_DENDRO':
        return chalk.rgb(165, 200, 56)
      case 'ELEMENT_ELECTRO':
        return chalk.rgb(176, 143, 194)
      case 'ELEMENT_GEO':
        return chalk.rgb(249, 182, 46)
      case 'ELEMENT_HYDRO':
        return chalk.rgb(75, 195, 241)
      case 'ELEMENT_PYRO':
        return chalk.rgb(239, 122, 53)
      default:
        return chalk.white
    }
  })()

  return formatFunction(char.name)
}

const formatPlayer = (playerNumber: number): string => chalk.italic(`Player ${chalk.rgb(251, 217, 148)(playerNumber)}`)

main()
