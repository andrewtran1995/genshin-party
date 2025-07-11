#!/usr/bin/env node

import process from 'node:process'
import { doNothing } from 'remeda'
import { match, P } from 'ts-pattern'
import { buildProgram } from './build-program.js'
import { throwError } from './throw-error.js'

process.on('uncaughtException', err =>
	match(err)
		.with(P.instanceOf(Error).and({ name: 'ExitPromptError' }), doNothing())
		.otherwise(throwError),
)
buildProgram().parse()
