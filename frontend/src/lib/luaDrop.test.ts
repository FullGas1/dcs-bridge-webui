import { describe, expect, it } from 'vitest';
import {
  dragHasFiles, formatDropMessage, MAX_LUA_FILE_BYTES, readDroppedLuaFile,
  type DroppedLuaFile,
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

describe('formatDropMessage', () => {
  const ok = (name: string): DroppedLuaFile => ({ ok: true, name, text: '' });
  const bad = (name: string, reason: 'not-lua' | 'too-large'): DroppedLuaFile => ({
    ok: false, name, reason,
  });

  it('is null for an empty drop', () => {
    expect(formatDropMessage([])).toBeNull();
  });

  it('is null for a single loaded file (the editor change speaks for itself)', () => {
    expect(formatDropMessage([ok('a.lua')])).toBeNull();
  });

  it('reports a count once more than one file is loaded', () => {
    expect(formatDropMessage([ok('a.lua'), ok('b.lua')])).toBe('2 files loaded');
  });

  it('reports a single ignored non-.lua file', () => {
    expect(formatDropMessage([bad('notes.txt', 'not-lua')])).toBe('1 ignored (not a .lua file)');
  });

  it('reports a single ignored oversized file', () => {
    expect(formatDropMessage([bad('big.lua', 'too-large')])).toBe('1 ignored (over 512 KB)');
  });

  it('aggregates loaded and ignored counts into one line', () => {
    expect(
      formatDropMessage([ok('a.lua'), ok('b.lua'), bad('c.txt', 'not-lua'), bad('d.lua', 'too-large')]),
    ).toBe('2 files loaded · 1 ignored (not a .lua file) · 1 ignored (over 512 KB)');
  });

  it('groups multiple files ignored for the same reason', () => {
    expect(formatDropMessage([bad('a.txt', 'not-lua'), bad('b.md', 'not-lua')])).toBe(
      '2 ignored (not a .lua file)',
    );
  });

  it('uses the singular "file loaded" for exactly one load alongside a rejection', () => {
    expect(formatDropMessage([ok('a.lua'), bad('b.txt', 'not-lua')])).toBe(
      '1 file loaded · 1 ignored (not a .lua file)',
    );
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
