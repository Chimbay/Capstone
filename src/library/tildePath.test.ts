import { expect, test } from 'bun:test'
import { tildePath } from './tildePath'

test('replaces the home folder with ~', () => {
  expect(tildePath('C:\\Users\\A\\Documents\\Notes\\', 'C:\\Users\\A')).toBe(
    '~/Documents/Notes'
  )
  expect(tildePath('c:\\users\\a\\Notes', 'C:\\Users\\A\\')).toBe('~/Notes')
  expect(tildePath('/home/a', '/home/a')).toBe('~')
})

test('leaves paths outside home alone', () => {
  expect(tildePath('C:\\Users\\Ab\\Notes', 'C:\\Users\\A')).toBe('C:/Users/Ab/Notes')
  expect(tildePath('D:\\Notes', 'C:\\Users\\A')).toBe('D:/Notes')
  expect(tildePath('/', undefined)).toBe('/')
})
