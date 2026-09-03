import { describe, expect, it } from 'vitest';
import {
  dragHasFiles, formatDropMessage, MAX_LUA_FILE_BYTES, partitionDroppedFiles, readDroppedLuaFile,
  type DropPartition,
} from './luaDrop';

function luaFile(name: string, contents: string): File {
  return new File([contents], name, { type: '' });
}

describe('readDroppedLuaFile', () => {
  it('accepts a .lua file and returns its text', async () => {
    const res = await readDroppedLuaFile(luaFile('patrol_check.lua', 'return checkMenu()'));

    expect(res).toEqual({ ok: true, name: 'patrol_check.lua', text: 'return checkMenu()' });
  });

  it('accepts the .lua extension case-insensitively', async () => {
    const res = await readDroppedLuaFile(luaFile('SCRIPT.LUA', 'return 1'));

    expect(res.ok).toBe(true);
  });

  it('rejects a non-.lua file as not-lua, without reading it', async () => {
    const res = await readDroppedLuaFile(luaFile('notes.txt', 'return 1'));

    expect(res).toEqual({ ok: false, name: 'notes.txt', reason: 'not-lua' });
  });

  it('rejects a .lua file larger than the cap as too-large', async () => {
    const res = await readDroppedLuaFile(
      luaFile('big.lua', 'x'.repeat(MAX_LUA_FILE_BYTES + 1)),
    );

    expect(res).toEqual({ ok: false, name: 'big.lua', reason: 'too-large' });
  });

  it('accepts a .lua file exactly at the cap', async () => {
    const res = await readDroppedLuaFile(luaFile('edge.lua', 'x'.repeat(MAX_LUA_FILE_BYTES)));

    expect(res.ok).toBe(true);
  });

  it('strips a leading UTF-8 BOM from the returned text', async () => {
    const res = await readDroppedLuaFile(luaFile('bom.lua', '﻿return 1'));

    expect(res).toMatchObject({ ok: true, text: 'return 1' });
  });

  it('leaves a BOM that is not at the very start untouched', async () => {
    const res = await readDroppedLuaFile(luaFile('mid.lua', 'return 1 -- ﻿'));

    expect(res).toMatchObject({ ok: true, text: 'return 1 -- ﻿' });
  });

  it('accepts an empty .lua file as empty text', async () => {
    const res = await readDroppedLuaFile(luaFile('empty.lua', ''));

    expect(res).toEqual({ ok: true, name: 'empty.lua', text: '' });
  });

  it('accepts a file named exactly ".lua"', async () => {
    const res = await readDroppedLuaFile(luaFile('.lua', 'return 1'));

    expect(res.ok).toBe(true);
  });

  it('caps at 512 KB', () => {
    expect(MAX_LUA_FILE_BYTES).toBe(512 * 1024);
  });
});

describe('partitionDroppedFiles', () => {
  it('keeps every accepted .lua for an add-button drop, in file order', async () => {
    const part = await partitionDroppedFiles(
      [luaFile('a.lua', 'A'), luaFile('b.lua', 'B'), luaFile('c.lua', 'C')],
      'add-button',
    );

    expect(part.loaded).toEqual([
      { name: 'a.lua', text: 'A' },
      { name: 'b.lua', text: 'B' },
      { name: 'c.lua', text: 'C' },
    ]);
    expect(part.rejected).toEqual([]);
  });

  it('keeps only the first accepted .lua for a widget drop, rest ignored', async () => {
    const part = await partitionDroppedFiles(
      [luaFile('first.lua', '1'), luaFile('second.lua', '2'), luaFile('third.lua', '3')],
      'widget',
    );

    expect(part.loaded).toEqual([{ name: 'first.lua', text: '1' }]);
    expect(part.rejected).toEqual([
      { name: 'second.lua', reason: 'extra-for-widget' },
      { name: 'third.lua', reason: 'extra-for-widget' },
    ]);
  });

  it('for a widget drop, the "first" is the first accepted one, skipping leading non-.lua', async () => {
    const part = await partitionDroppedFiles(
      [luaFile('note.txt', 'x'), luaFile('good.lua', 'G'), luaFile('extra.lua', 'E')],
      'widget',
    );

    expect(part.loaded).toEqual([{ name: 'good.lua', text: 'G' }]);
    expect(part.rejected).toEqual([
      { name: 'note.txt', reason: 'not-lua' },
      { name: 'extra.lua', reason: 'extra-for-widget' },
    ]);
  });

  it('separates non-.lua and oversized files for an add-button drop', async () => {
    const part = await partitionDroppedFiles(
      [
        luaFile('ok.lua', 'OK'),
        luaFile('notes.txt', 'x'),
        luaFile('big.lua', 'x'.repeat(MAX_LUA_FILE_BYTES + 1)),
      ],
      'add-button',
    );

    expect(part.loaded).toEqual([{ name: 'ok.lua', text: 'OK' }]);
    expect(part.rejected).toEqual([
      { name: 'notes.txt', reason: 'not-lua' },
      { name: 'big.lua', reason: 'too-large' },
    ]);
  });

  it('strips a BOM from each loaded file', async () => {
    const part = await partitionDroppedFiles([luaFile('b.lua', '﻿return 1')], 'add-button');

    expect(part.loaded[0]!.text).toBe('return 1');
  });

  it('returns an empty partition for no files', async () => {
    expect(await partitionDroppedFiles([], 'add-button')).toEqual({ loaded: [], rejected: [] });
  });
});

describe('formatDropMessage', () => {
  const part = (loaded: string[], rejected: DropPartition['rejected'] = []): DropPartition => ({
    loaded: loaded.map((name) => ({ name, text: '' })),
    rejected,
  });

  it('is null for an empty drop', () => {
    expect(formatDropMessage(part([]))).toBeNull();
  });

  it('is null for a single loaded file (the editor change speaks for itself)', () => {
    expect(formatDropMessage(part(['a.lua']))).toBeNull();
  });

  it('reports a count once more than one file is loaded', () => {
    expect(formatDropMessage(part(['a.lua', 'b.lua']))).toBe('2 files loaded');
  });

  it('reports a single ignored non-.lua file', () => {
    expect(formatDropMessage(part([], [{ name: 'notes.txt', reason: 'not-lua' }]))).toBe(
      '1 ignored (not a .lua file)',
    );
  });

  it('reports a single ignored oversized file', () => {
    expect(formatDropMessage(part([], [{ name: 'big.lua', reason: 'too-large' }]))).toBe(
      '1 ignored (over 512 KB)',
    );
  });

  it('reports files ignored because a widget takes only one', () => {
    expect(
      formatDropMessage(part(['a.lua'], [
        { name: 'b.lua', reason: 'extra-for-widget' },
        { name: 'c.lua', reason: 'extra-for-widget' },
      ])),
    ).toBe('1 file loaded · 2 ignored (only one file per widget)');
  });

  it('aggregates loaded and ignored counts into one line', () => {
    expect(
      formatDropMessage(part(['a.lua', 'b.lua'], [
        { name: 'c.txt', reason: 'not-lua' },
        { name: 'd.lua', reason: 'too-large' },
      ])),
    ).toBe('2 files loaded · 1 ignored (not a .lua file) · 1 ignored (over 512 KB)');
  });

  it('groups multiple files ignored for the same reason', () => {
    expect(
      formatDropMessage(part([], [
        { name: 'a.txt', reason: 'not-lua' },
        { name: 'b.md', reason: 'not-lua' },
      ])),
    ).toBe('2 ignored (not a .lua file)');
  });
});

describe('dragHasFiles', () => {
  it('is true for a drag whose types include "Files"', () => {
    expect(dragHasFiles({ dataTransfer: { types: ['Files'] } } as unknown as DragEvent)).toBe(true);
  });

  it('is false for a text-only drag', () => {
    expect(
      dragHasFiles({ dataTransfer: { types: ['text/plain'] } } as unknown as DragEvent),
    ).toBe(false);
  });

  it('is false when there is no dataTransfer', () => {
    expect(dragHasFiles({} as DragEvent)).toBe(false);
  });
});
