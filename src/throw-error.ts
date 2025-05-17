export function throwError<T extends Error>(err: T): never {
	throw err
}
