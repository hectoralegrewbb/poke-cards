import assert from 'node:assert/strict';
import test from 'node:test';
import { createCombat, endPlayerTurn, executeMove, inflictStatus, tickStatusForSide, validateGameData } from '../src/engine/index.js';
import { createRun, useItem } from '../src/run/index.js';
import { buildEncounter } from '../src/run/encounterBuilder.js';
import { eligiblePool, isWildEligible } from '../src/run/wildEligibility.js';
import { importPokedex, parseCsv, toSpeciesId } from '../scripts/pokedexSyncCore.js';
import { data, makeCombat, makeSturdy } from './helpers.js';

const regions = ['kanto', 'johto', 'hoenn', 'sinnoh', 'unova'];

test('No aparecen Arcanine, Rhydon ni otros evolucionados fuertes tras 0-2 gimnasios', () => {
  for (let stageIndex = 0; stageIndex <= 2; stageIndex += 1) {
    for (const id of ['arcanine', 'rhydon', 'charizard', 'salamence', 'slaking', 'dragonite']) {
      assert.equal(isWildEligible(data, id, stageIndex), false, `${id} en etapa ${stageIndex + 1}`);
    }
    for (const regionId of regions) {
      for (const seed of [1, 13, 82]) {
        const run = createRun({ data, regionId, mode: 'regional', seed });
        run.stageIndex = stageIndex;
        run.badges = Array.from({ length: stageIndex }, (_, index) => `M${index + 1}`);
        const stage = run.campaign.stages[stageIndex];
        for (const id of stage.wildPool) {
          assert.ok(isWildEligible(data, id, stageIndex), `${regionId} semilla ${seed}: ${id}`);
        }
        for (const node of ['wild', 'combat', 'elite', 'rival', 'villain']) {
          const encounter = buildEncounter(run, { type: node });
          for (const enemy of encounter.enemies) {
            assert.ok(isWildEligible(data, enemy.speciesId, stageIndex), `${node} lanzó ${enemy.speciesId}`);
            assert.ok(enemy.maxMoveCost <= Math.max(1, data.balance.wildMoveCostCaps[stageIndex]));
          }
        }
      }
    }
  }
});

test('Los pools inseguros de guardados anteriores no reaparecen en combate', () => {
  const run = createRun({ data, regionId: 'kanto', seed: 17 });
  run.stageIndex = 2;
  run.campaign.stages[2].wildPool = ['rhydon', 'arcanine', 'rhyhorn'];
  for (let i = 0; i < 20; i += 1) {
    const combat = buildEncounter(run, { type: 'wild' });
    assert.ok(combat.enemies.every((enemy) => enemy.speciesId === 'rhyhorn'));
  }
});

test('La IA salvaje nunca ejecuta ataques por encima del coste habilitado', () => {
  const combat = createCombat({
    data,
    party: [createRun({ data, seed: 1 }).party[0]],
    enemies: [{ speciesId: 'rhyhorn', row: 'front', profileId: 'aggressive', maxMoveCost: 0 }],
    deckCardIds: Object.keys(data.startingDeck).flatMap((id) => Array(data.startingDeck[id]).fill(id)),
    seed: 12
  });
  const foe = combat.teams.enemy[0];
  assert.ok(foe.intent, 'Debe conservar un ataque básico para luchar');
  assert.equal(data.moves[foe.intent.moveId].cost, 0);
  assert.ok(foe.moves.some((id) => data.moves[id].cost > 0), 'Rhyhorn conserva sus ataques superiores');
});

test('Todas las especies tienen un ataque de coste 0 y sin cooldown, también tras evolucionar', () => {
  assert.deepEqual(validateGameData(data), []);
  for (const [id, species] of Object.entries(data.species)) {
    assert.ok(species.moves.some((moveId) => {
      const move = data.moves[moveId];
      return move.power > 0 && move.cost === 0 && move.cooldown === 0;
    }), `Ataque básico ausente: ${id}`);
  }
});

test('Parálisis no quita PS, puede bloquear el turno propio y no deja secuelas de retroceso', () => {
  const combat = makeCombat({ party: ['snivy'], enemies: [{ speciesId: 'roggenrola' }] });
  makeSturdy(combat);
  const pokemon = combat.teams.player[0];
  assert.equal(inflictStatus(combat, pokemon, 'paralysis'), true);
  const originalHp = pokemon.hp;
  tickStatusForSide(combat, 'player');
  assert.equal(pokemon.hp, originalHp);
  combat.rng.next = () => 0; // garantiza fallo de acción de un 25 %
  combat.teams.enemy[0].intent = null; // el enemigo no puede provocar retroceso en esta prueba
  const result = endPlayerTurn(combat);
  assert.equal(result.ok, true);
  assert.equal(pokemon.actionsLeft, 0);
  assert.ok(result.events.some((event) => event.type === 'paralyzed' && event.targetId === pokemon.uid));
  assert.equal(pokemon.status, 'paralysis');
});

test('Parálisis puede impedir el movimiento del rival, y se cura con antiparalizador', () => {
  const combat = makeCombat({ party: ['snivy'], enemies: [{ speciesId: 'roggenrola' }] });
  makeSturdy(combat);
  const foe = combat.teams.enemy[0];
  inflictStatus(combat, foe, 'paralysis');
  combat.rng.next = () => 0;
  const result = endPlayerTurn(combat);
  assert.ok(result.events.some((event) => event.type === 'paralyzed' && event.targetId === foe.uid));
  assert.ok(!result.events.some((event) => event.type === 'moveUsed' && event.actorId === foe.uid));
  const run = createRun({ data, seed: 8 });
  run.inventory.paralyzeHeal = 1;
  run.party[0].status = 'paralysis';
  assert.equal(useItem(run, 'paralyzeHeal', run.party[0].uid).ok, true);
  assert.equal(run.party[0].status, null);
});

test('Golpe cuerpo puede paralizar; Onda trueno no afecta a Tierra', () => {
  const combat = makeCombat({ party: ['blastoise'], enemies: [{ speciesId: 'rhyhorn' }] });
  makeSturdy(combat);
  const attacker = combat.teams.player[0];
  attacker.moves[0] = 'thunderWave';
  combat.rng.next = () => 0;
  executeMove(combat, attacker, 0, combat.teams.enemy[0]);
  assert.equal(combat.teams.enemy[0].status, null);
  assert.ok(combat.log.some((event) => event.type === 'moveImmune'));
  const normal = makeCombat({ party: ['blastoise'], enemies: [{ speciesId: 'snivy' }] });
  makeSturdy(normal);
  normal.teams.player[0].moves[0] = 'bodySlam';
  normal.rng.next = () => 0;
  executeMove(normal, normal.teams.player[0], 0, normal.teams.enemy[0]);
  assert.equal(normal.teams.enemy[0].status, 'paralysis');
});

test('Importador CSV: parseo con comillas, IDs y crecimiento determinista de catálogo', () => {
  assert.deepEqual(parseCsv('id,name\n1,"Mr, Mime"\r\n2,Test\n'), [{ id: '1', name: 'Mr, Mime' }, { id: '2', name: 'Test' }]);
  assert.equal(toSpeciesId('ho-oh'), 'hoOh');
  const speciesRows = ['id,identifier,evolves_from_species_id,is_legendary,is_mythical'];
  const pokemonRows = ['id,species_id,is_default'];
  const typesRows = ['pokemon_id,type_id,slot'];
  const statsRows = ['pokemon_id,stat_id,base_stat'];
  for (let id = 1; id <= 649; id += 1) {
    speciesRows.push(`${id},pokemon-${id},${id === 2 ? 1 : ''},0,0`);
    pokemonRows.push(`${id},${id},1`);
    typesRows.push(`${id},1,1`);
    for (let statId = 1; statId <= 5; statId += 1) statsRows.push(`${id},${statId},55`);
  }
  const csvs = { speciesCsv: speciesRows.join('\n'), pokemonCsv: pokemonRows.join('\n'), typesCsv: typesRows.join('\n'), statsCsv: statsRows.join('\n') };
  const result = importPokedex(csvs, { species: {}, moves: data.moves });
  assert.equal(result.added, 649);
  assert.equal(Object.keys(result.species).length, 649);
  assert.deepEqual(result.species.pokemon1.evolutions[0].to, 'pokemon2');
  assert.ok(result.species.pokemon45.moves.some((id) => data.moves[id].cost === 0));
});
