/* global ED, Con, COM, Q, SV, Sys, Def, PR */

// eslint-disable-next-line no-global-assign
ED = {};

ED.ClearEdict = function(ed) { // TODO: move to SV.Edict
  if (ed.entity) {
    ed.entity.free();
    ed.entity = null;
  }
  ed.clear();
  ed.free = false;
};

ED.Alloc = function() { // TODO: move to SV?
  let i; let e;
  for (i = SV.svs.maxclients + 1; i < SV.server.num_edicts; ++i) {
    e = SV.server.edicts[i];
    if ((e.free === true) && ((e.freetime < 2.0) || ((SV.server.time - e.freetime) > 0.5))) {
      ED.ClearEdict(e);
      return e;
    }
  }
  if (i === Def.max_edicts) {
    // TODO: soft limit, hard limit, also allocate directly 200 more in one go
    Con.PrintWarning(`ED.Alloc triggered max_edicts (${Def.max_edicts})\n`);
  }
  e = SV.server.edicts[SV.server.num_edicts++];
  if (!e) {
    e = new SV.Edict(i);
    SV.server.edicts.push(e);
  }
  ED.ClearEdict(e);
  return e;
};

ED.Free = function(ed) { // TODO: move to SV.Edict
  SV.UnlinkEdict(ed);
  // mark as free, it will be cleared later
  ed.free = true;
  if (ed.entity) {
    // only reset the data, not free the entire entity yet
    // freeing the entity is done in ED.ClearEdict
    ed.entity.clear();
  }
  ed.freetime = SV.server.time;
};

ED.Print = function(ed) {
  if (ed.isFree()) {
    return;
  }
  Con.Print('\nEDICT ' + ed.num + ':\n');

  for (let i = 1; i < PR.fielddefs.length; i++) {
    const d = PR.fielddefs[i];
    const name = PR.GetString(d.name);

    if (/_[xyz]$/.test(name)) {
      continue;
    }

    Con.Print(`${name.padStart(24, '.')}: ${ed.entity[name]}\n`);
  }
};

ED.PrintEdicts = function() {
  if (!SV.server.active) {
    return;
  }

  Con.Print(`${SV.server.num_edicts} entities\n`);
  SV.server.edicts.forEach(ED.Print);
};


ED.PrintEdict_f = function(id) {
  if (SV.server.active !== true) {
    return;
  }
  if (id === undefined) {
    Con.Print(`Usage: ${this.command} <num>\n`);
    return;
  }
  const i = Q.atoi(id);
  if ((i >= 0) && (i < SV.server.num_edicts)) {
    ED.Print(SV.server.edicts[i]);
  }
};

ED.Count = function() {
  if (SV.server.active !== true) {
    return;
  }
  let i; let ent; let active = 0; let models = 0; let solid = 0; let step = 0;
  for (i = 0; i < SV.server.num_edicts; ++i) {
    ent = SV.server.edicts[i];
    if (ent.isFree() === true) {
      continue;
    }
    ++active;
    if (ent.entity.solid) {
      ++solid;
    }
    if (ent.entity.model) {
      ++models;
    }
    if (ent.entity.movetype === SV.movetype.step) {
      ++step;
    }
  }
  const num_edicts = SV.server.num_edicts;
  Con.Print('num_edicts:' + (num_edicts <= 9 ? '  ' : (num_edicts <= 99 ? ' ' : '')) + num_edicts + '\n');
  Con.Print('active    :' + (active <= 9 ? '  ' : (active <= 99 ? ' ' : '')) + active + '\n');
  Con.Print('view      :' + (models <= 9 ? '  ' : (models <= 99 ? ' ' : '')) + models + '\n');
  Con.Print('touch     :' + (solid <= 9 ? '  ' : (solid <= 99 ? ' ' : '')) + solid + '\n');
  Con.Print('step      :' + (step <= 9 ? '  ' : (step <= 99 ? ' ' : '')) + step + '\n');
};

ED.ParseEdict = function(data, ent, initialData = {}) {
  // If not the world entity, clear the entity data
  // CR: this is required, otherwise we would overwrite data SV.SpawnServer had set prior
  if (ent.num > 0) {
    ent.clear();
  }

  let keyname;
  let anglehack;
  let init = false;

  // Parse until closing brace
  while (true) {
    data = COM.Parse(data);

    if (COM.token.charCodeAt(0) === 125) {
      // Closing brace found
      break;
    }

    if (data == null) {
      Sys.Error('ED.ParseEdict: EOF without closing brace');
    }

    if (COM.token === 'angle') {
      keyname = 'angles';
      anglehack = true;
    } else {
      keyname = COM.token;
      anglehack = false;

      if (keyname === 'light') {
        keyname = 'light_lev'; // Quake 1 convention
      }
    }

    // Remove trailing spaces in keyname
    keyname = keyname.trimEnd();

    // Parse the value
    data = COM.Parse(data);

    if (data == null) {
      Sys.Error('ED.ParseEdict: EOF without closing brace');
    }

    if (COM.token.charCodeAt(0) === 125) {
      Sys.Error('ED.ParseEdict: Closing brace without data');
    }

    if (keyname.startsWith('_')) {
      // Ignore keys starting with "_"
      continue;
    }

    if (anglehack) {
      COM.token = `0 ${COM.token} 0`;
    }

    initialData[keyname] = COM.token.replace(/\\n/g, '\n');

    init = true;
  }

  // Mark the entity as free if no valid initialization occurred
  if (!init) {
    ent.free = true;
  }

  return data;
};

/**
 * Loads entities from a file.
 * @param {string} data - The data to load.
 */
ED.LoadFromFile = function(data) {
  let inhibit = 0;
  let ent = null;
  SV.server.gameAPI.time = SV.server.time;

  while (true) {
    data = COM.Parse(data);
    if (!data) {
      break;
    }

    if (COM.token !== '{') {
      Sys.Error(`ED.LoadFromFile: found ${COM.token} when expecting {`);
    }

    const initialData = {};
    ent = ent ? ED.Alloc() : SV.server.edicts[0];
    data = ED.ParseEdict(data, ent, initialData);

    if (!initialData.classname) {
      Con.Print(`No classname for edict ${ent.num}\n`);
      ED.Free(ent);
      continue;
    }

    const maySpawn = SV.server.gameAPI.prepareEntity(ent, initialData.classname, initialData);

    if (!maySpawn) {
      ED.Free(ent);
      inhibit++;
      continue;
    }

    const spawned = SV.server.gameAPI.spawnPreparedEntity(ent);

    if (!spawned) {
      Con.Print(`Could not spawn entity for edict ${ent.num}:\n`);
      ED.Print(ent);
      ED.Free(ent);
      continue;
    }
  }

  Con.DPrint(`${inhibit} entities inhibited\n`);
};
