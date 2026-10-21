/** @type {import("prettier").Config} */

import fs from 'fs'
import { fileURLToPath } from 'url'

// fileURLToPath, not URL.pathname: on Windows the pathname is "/C:/...", which resolves to "C:\C:\..."
const packageJsonPath = fileURLToPath(new URL('package.json', import.meta.url))

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
const typescriptVersion = packageJson.devDependencies.typescript || packageJson.dependencies.typescript

export default {
    arrowParens: 'avoid',
    singleQuote: true,
    printWidth: 90,
    semi: false,
    trailingComma: 'none',
    // Keep each file's existing line endings: Git checks out CRLF on Windows and LF in CI
    endOfLine: 'auto',
    plugins: ['@ianvs/prettier-plugin-sort-imports', 'prettier-plugin-tailwindcss'],
    // @ianvs/prettier-plugin-sort-imports plugin's options
    // https://github.com/IanVS/prettier-plugin-sort-imports#options
    importOrderParserPlugins: ['typescript', 'jsx', 'decorators-legacy'],
    importOrderTypeScriptVersion: typescriptVersion,
};