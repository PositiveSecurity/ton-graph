import adaptersFunc from './func';
import movelangAdapter from './move';
import cairoAdapter from './cairo';
import plutusAdapter from './plutus';
import cadenceAdapter from './cadence';
import michelsonAdapter from './michelson';
import clarAdapter from './clar';
import inkAdapter from './ink';
import scillaAdapter from './scilla';
import pactAdapter from './pact';
import scryptoAdapter from './scrypto';
import sorobanAdapter from './soroban';
import ligoAdapter from './ligo';
import aikenAdapter from './aiken';
import leoAdapter from './leo';
import tealAdapter from './teal';
import glowAdapter from './glow';
import huffAdapter from './huff';
import bambooAdapter from './bamboo';
import sophiaAdapter from './sophia';
import flintAdapter from './flint';
import feAdapter from './fe';
import liquidityAdapter from './liquidity';
import reachAdapter from './reach';
import rellAdapter from './rell';
import rholangAdapter from './rholang';
import marloweAdapter from './marlowe';

const adapters = [
  ...adaptersFunc,
  movelangAdapter,
  cairoAdapter,
  plutusAdapter,
  cadenceAdapter,
  michelsonAdapter,
  clarAdapter,
  inkAdapter,
  scillaAdapter,
  pactAdapter,
  scryptoAdapter,
  sorobanAdapter,
  tealAdapter,
  ligoAdapter,
  aikenAdapter,
  leoAdapter,
  glowAdapter,
  huffAdapter,
  bambooAdapter,
  sophiaAdapter,
  flintAdapter,
  feAdapter,
  liquidityAdapter,
  reachAdapter,
  rellAdapter,
  rholangAdapter,
  marloweAdapter
];

export default adapters;
export {
  cairoAdapter,
  plutusAdapter,
  cadenceAdapter,
  michelsonAdapter,
  movelangAdapter,
  clarAdapter,
  inkAdapter,
  scillaAdapter,
  pactAdapter,
  scryptoAdapter,
  sorobanAdapter,
  tealAdapter,
  ligoAdapter,
  aikenAdapter,
  leoAdapter,
  glowAdapter,
  huffAdapter,
  bambooAdapter,
  sophiaAdapter,
  flintAdapter,
  feAdapter,
  liquidityAdapter,
  reachAdapter,
  rellAdapter,
  rholangAdapter,
  marloweAdapter
};
