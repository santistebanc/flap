/**
 * Utility functions for working with async Result types (ts-results)
 */
import { Result, Ok, Err } from 'ts-results';

/**
 * Convert a Promise to a Result, catching errors and converting them
 */
export async function fromPromise<T, E = Error>(
  promise: Promise<T>,
  errorMapper?: (error: unknown) => E
): Promise<Result<T, E>> {
  try {
    const value = await promise;
    return Ok(value);
  } catch (error) {
    const mappedError = errorMapper
      ? errorMapper(error)
      : (error instanceof Error ? error : new Error(String(error))) as E;
    return Err(mappedError);
  }
}

/**
 * Convert a safe Promise (one that returns Result) to Result
 */
export async function fromSafePromise<T, E>(
  promise: Promise<Result<T, E>>
): Promise<Result<T, E>> {
  try {
    return await promise;
  } catch (error) {
    return Err(error instanceof Error ? error : new Error(String(error)) as E);
  }
}

/**
 * Chain Result operations
 */
export function andThen<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E> | Promise<Result<U, E>>
): Result<U, E> | Promise<Result<U, E>> {
  if (result.err) {
    return Err(result.val);
  }
  return fn(result.val);
}

