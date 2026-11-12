import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveMatchOutcome } from '../src/combat/MatchRules.js';

test('equal health is a genuine draw', () => assert.equal(resolveMatchOutcome(55, 55), 'draw'));
test('higher player health wins', () => assert.equal(resolveMatchOutcome(56, 55), 'victory'));
test('lower player health loses', () => assert.equal(resolveMatchOutcome(54, 55), 'defeat'));
