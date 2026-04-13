import chalk from "chalk";

/**
 * Prints a red error message to stderr and exits the process with code 1.
 * Typed as `never` to let TypeScript know code after this call is unreachable.
 */
export function die(msg: string): never {
  console.error(chalk.red(`error: ${msg}`));
  process.exit(1);
}
