/* global Vector */

import { attn, channel, moveType, solid } from "../../Defs.mjs";
import { QuakeEntityAI } from "../../helper/AI.mjs";
import BaseMonster from "./BaseMonster.mjs";

export default class ArmySoldierMonster extends BaseMonster {
  static classname = 'monster_army';

  _precache() {
    this.engine.PrecacheModel("progs/soldier.mdl");
    this.engine.PrecacheModel("progs/h_guard.mdl");
    this.engine.PrecacheModel("progs/gib1.mdl");
    this.engine.PrecacheModel("progs/gib2.mdl");
    this.engine.PrecacheModel("progs/gib3.mdl");

    this.engine.PrecacheSound("soldier/death1.wav");
    this.engine.PrecacheSound("soldier/idle.wav");
    this.engine.PrecacheSound("soldier/pain1.wav");
    this.engine.PrecacheSound("soldier/pain2.wav");
    this.engine.PrecacheSound("soldier/sattck1.wav");
    this.engine.PrecacheSound("soldier/sight1.wav");

    this.engine.PrecacheSound("player/udeath.wav");		// gib death
  }

  _newEntityAI() {
    return new QuakeEntityAI(this);
  }

  _declareFields() {
    super._declareFields();
    this._aiState = null;
  }

  _initStates() {
    this._defineState('army_stand1', 'stand1', 'army_stand2', () => this._ai.stand());
    this._defineState('army_stand2', 'stand2', 'army_stand3', () => this._ai.stand());
    this._defineState('army_stand3', 'stand3', 'army_stand4', () => this._ai.stand());
    this._defineState('army_stand4', 'stand4', 'army_stand5', () => this._ai.stand());
    this._defineState('army_stand5', 'stand5', 'army_stand6', () => this._ai.stand());
    this._defineState('army_stand6', 'stand6', 'army_stand7', () => this._ai.stand());
    this._defineState('army_stand7', 'stand7', 'army_stand8', () => this._ai.stand());
    this._defineState('army_stand8', 'stand8', 'army_stand1', () => this._ai.stand());

    this._defineState('army_walk1', 'prowl_1', 'army_walk2', () => {
      if (Math.random() < 0.2) {
        this.startSound(channel.CHAN_VOICE, 'soldier/idle.wav', 1.0, attn.ATTN_IDLE);
      }
      this._ai.walk(1);
    });
    this._defineState('army_walk2', 'prowl_2', 'army_walk3', () => this._ai.walk(1));
    this._defineState('army_walk3', 'prowl_3', 'army_walk4', () => this._ai.walk(1));
    this._defineState('army_walk4', 'prowl_4', 'army_walk5', () => this._ai.walk(1));
    this._defineState('army_walk5', 'prowl_5', 'army_walk6', () => this._ai.walk(2));
    this._defineState('army_walk6', 'prowl_6', 'army_walk7', () => this._ai.walk(3));
    this._defineState('army_walk7', 'prowl_7', 'army_walk8', () => this._ai.walk(4));
    this._defineState('army_walk8', 'prowl_8', 'army_walk9', () => this._ai.walk(4));
    this._defineState('army_walk9', 'prowl_9', 'army_walk10', () => this._ai.walk(2));
    this._defineState('army_walk10', 'prowl_10', 'army_walk11', () => this._ai.walk(2));
    this._defineState('army_walk11', 'prowl_11', 'army_walk12', () => this._ai.walk(2));
    this._defineState('army_walk12', 'prowl_12', 'army_walk13', () => this._ai.walk(1));
    this._defineState('army_walk13', 'prowl_13', 'army_walk14', () => this._ai.walk(0));
    this._defineState('army_walk14', 'prowl_14', 'army_walk15', () => this._ai.walk(1));
    this._defineState('army_walk15', 'prowl_15', 'army_walk16', () => this._ai.walk(1));
    this._defineState('army_walk16', 'prowl_16', 'army_walk17', () => this._ai.walk(1));
    this._defineState('army_walk17', 'prowl_17', 'army_walk18', () => this._ai.walk(3));
    this._defineState('army_walk18', 'prowl_18', 'army_walk19', () => this._ai.walk(3));
    this._defineState('army_walk19', 'prowl_19', 'army_walk20', () => this._ai.walk(3));
    this._defineState('army_walk20', 'prowl_20', 'army_walk21', () => this._ai.walk(3));
    this._defineState('army_walk21', 'prowl_21', 'army_walk22', () => this._ai.walk(2));
    this._defineState('army_walk22', 'prowl_22', 'army_walk23', () => this._ai.walk(1));
    this._defineState('army_walk23', 'prowl_23', 'army_walk24', () => this._ai.walk(1));
    this._defineState('army_walk24', 'prowl_24', 'army_walk1', () => this._ai.walk(1));

    this._defineState('army_run1', 'run1', 'army_run2', () => {
      if (Math.random() < 0.2) {
        this.startSound(channel.CHAN_VOICE, 'soldier/idle.wav', 1.0, attn.ATTN_IDLE);
      }
      this._ai.run(11);
    });
    this._defineState('army_run2', 'run2', 'army_run3', () => this._ai.run(15));
    this._defineState('army_run3', 'run3', 'army_run4', () => this._ai.run(10));
    this._defineState('army_run4', 'run4', 'army_run5', () => this._ai.run(10));
    this._defineState('army_run5', 'run5', 'army_run6', () => this._ai.run(8));
    this._defineState('army_run6', 'run6', 'army_run7', () => this._ai.run(15));
    this._defineState('army_run7', 'run7', 'army_run8', () => this._ai.run(10));
    this._defineState('army_run8', 'run8', 'army_run1', () => this._ai.run(8));
  }

  thinkStand() {
    if (this.edictId === 13) console.log('thinkStand');
    this._runState('army_stand1');
  }

  thinkWalk() {
    if (this.edictId === 13) console.log('thinkWalk');
    this._runState('army_walk1');
  }

  thinkRun() {
    if (this.edictId === 13) console.log('thinkRun');
    this._runState('army_run1');
  }

  thinkMissile() {
    this._runState('army_atk1');
  }

  thinkPain(attackerEntity, damage) {
    // local float r;

    // if (self.pain_finished > time)
    //   return;

    // r = random();

    // if (r < 0.2)
    // {
    //   self.pain_finished = time + 0.6;
    //   army_pain1 ();
    //   sound (self, CHAN_VOICE, "soldier/pain1.wav", 1, ATTN_NORM);
    // }
    // else if (r < 0.6)
    // {
    //   self.pain_finished = time + 1.1;
    //   army_painb1 ();
    //   sound (self, CHAN_VOICE, "soldier/pain2.wav", 1, ATTN_NORM);
    // }
    // else
    // {
    //   self.pain_finished = time + 1.1;
    //   army_painc1 ();
    //   sound (self, CHAN_VOICE, "soldier/pain2.wav", 1, ATTN_NORM);
    // }
  }

  thinkDie() {

// // check for gib
// if (self.health < -35)
// 	{
// 		sound (self, CHAN_VOICE, "player/udeath.wav", 1, ATTN_NORM);
// 		ThrowHead ("progs/h_guard.mdl", self.health);
// 		ThrowGib ("progs/gib1.mdl", self.health);
// 		ThrowGib ("progs/gib2.mdl", self.health);
// 		ThrowGib ("progs/gib3.mdl", self.health);
// 		return;
// 	}

// // regular death
// 	sound (self, CHAN_VOICE, "soldier/death1.wav", 1, ATTN_NORM);
// 	if (random() < 0.5)
// 		army_die1 ();
// 	else
// 		army_cdie1 ();
  }

  spawn() {
    if (this.game.deathmatch) {
      this.remove();
      return;
    }

    this.solid = solid.SOLID_SLIDEBOX;
    this.movetype = moveType.MOVETYPE_STEP;

    this.setModel("progs/soldier.mdl");
    this.setSize(new Vector(-16.0, -16.0, -24.0), new Vector(16.0, 16.0, 40.0));
    this.health = 30;

    super.spawn();
  }

  sightSound() {
    this.startSound(channel.CHAN_VOICE, "soldier/sight1.wav", 1.0, attn.ATTN_NORM);
  }
}
