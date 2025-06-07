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
import bambooAdapter from './bamboo';

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
  bambooAdapter
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
  bambooAdapter
};
