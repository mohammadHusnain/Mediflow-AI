import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ALIASES = {
  '@features/': path.join(ROOT, 'src', 'features'),
  '@shared/': path.join(ROOT, 'src', 'shared'),
}

function resolveExistingPath(target) {
  if (path.extname(target)) return target

  for (const extension of ['.js', '.jsx', '.mjs']) {
    const candidate = `${target}${extension}`
    if (fs.existsSync(candidate)) return candidate
  }

  return target
}

export async function resolve(specifier, context, nextResolve) {
  for (const [alias, aliasPath] of Object.entries(ALIASES)) {
    if (specifier.startsWith(alias)) {
      const target = resolveExistingPath(path.join(aliasPath, specifier.slice(alias.length)))

      return {
        shortCircuit: true,
        url: pathToFileURL(target).href,
      }
    }
  }

  if (
    context.parentURL?.startsWith('file:') &&
    (specifier.startsWith('./') || specifier.startsWith('../'))
  ) {
    const target = resolveExistingPath(fileURLToPath(new URL(specifier, context.parentURL)))

    if (fs.existsSync(target)) {
      return {
        shortCircuit: true,
        url: pathToFileURL(target).href,
      }
    }
  }

  return nextResolve(specifier, context)
}
