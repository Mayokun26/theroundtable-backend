import { Character } from '../types/conversation';

// characters.js is the single source of truth right now.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const rawCharacters = require('../data/characters');

const characters: Character[] = rawCharacters as Character[];

export function getAllCharacters(): Character[] {
  return characters;
}

export function getCharacterById(id: string): Character | undefined {
  return characters.find((character) => character.id === id);
}

export function getCharactersByIds(ids: string[]): Character[] {
  const idSet = new Set(ids);
  return characters.filter((character) => idSet.has(character.id));
}
