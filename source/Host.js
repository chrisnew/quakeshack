/* global Host, Con, Mod, COM, Host, CL, Cmd, Cvar, Vector, S, Q, NET, MSG, Protocol, SV, SCR, R, Chase, IN, Sys, Def, V, CDAudio, Sbar, Draw, VID, M, PR, Key, W, SZ, Shack, Game */

// eslint-disable-next-line no-global-assign
Host = {};

Host.framecount = 0;

Host.EndGame = function(message) {
  Con.Print('Host.EndGame: ' + message + '\n');
  if (CL.cls.demonum !== -1) {
    CL.NextDemo();
  } else {
    CL.Disconnect();
  }
  M.Alert('Host.EndGame', message);
};

Host.Error = function(error) {
  if (Host.inerror === true) {
    Sys.Error('Host.Error: recursively entered');
  }
  Host.inerror = true;
  if (!Host.dedicated.value) {
    SCR.EndLoadingPlaque();
  }
  Con.Print('Host.Error: ' + error + '\n');
  if (SV.server.active === true) {
    Host.ShutdownServer();
  }
  CL.Disconnect();
  CL.cls.demonum = -1;
  Host.inerror = false;
  M.Alert('Host.Error', error);
};

Host.FindMaxClients = function() {
  SV.svs.maxclients = 1;
  SV.svs.maxclientslimit = Def.max_clients;
  SV.svs.clients = [];
  if (!Host.dedicated.value) {
    CL.cls.state = CL.active.disconnected;
  }
  for (let i = 0; i < SV.svs.maxclientslimit; i++) {
    SV.svs.clients.push({ // TODO: Client (SV.Client) class
      num: i,
      message: {data: new ArrayBuffer(8000), cursize: 0, allowoverflow: true},
      colors: 0,
      old_frags: 0,
      last_ping_update: 0,
      netconnection: null,
      name: '', // must be an empty string, otherwise Sbar is going to bug out
      edict: null, // connected to an edict upon server spawn

      /** spawn parms are carried from level to level */
      spawn_parms: new Array(16),

      clear() {
        this.edict = null;
        this.netconnection = null;
        this.message.cursize = 0;
        this.message.allowoverflow = false;
        this.colors = 0;
        this.old_frags = 0;
        this.last_ping_update = 0;
        this.active = false;
        this.name = '';
      },

      consolePrint(message) {
        MSG.WriteByte(this.message, Protocol.svc.print);
        MSG.WriteString(this.message, message);
      },

      centerPrint(message) {
        MSG.WriteByte(this.message, Protocol.svc.centerprint);
        MSG.WriteString(this.message, message);
      },

      sendConsoleCommands(commandline) {
        MSG.WriteByte(this.message, Protocol.svc.stufftext);
        MSG.WriteString(this.message, commandline);
      }
    });
  }
  Cvar.SetValue('deathmatch', 0);
};

Host.InitLocal = function(dedicated) {
  Host.InitCommands();
  Host.framerate = Cvar.RegisterVariable('host_framerate', '0');
  Host.speeds = Cvar.RegisterVariable('host_speeds', '0');
  Host.ticrate = Cvar.RegisterVariable('sys_ticrate', '0.05');
  Host.serverprofile = Cvar.RegisterVariable('serverprofile', '0');
  Host.fraglimit = Cvar.RegisterVariable('fraglimit', '0', false, true);
  Host.timelimit = Cvar.RegisterVariable('timelimit', '0', false, true);
  Host.teamplay = Cvar.RegisterVariable('teamplay', '0', false, true);
  Host.samelevel = Cvar.RegisterVariable('samelevel', '0');
  Host.noexit = Cvar.RegisterVariable('noexit', '0', false, true);
  Host.skill = Cvar.RegisterVariable('skill', '1');
  Host.developer = Cvar.RegisterVariable('developer', '0');
  Host.deathmatch = Cvar.RegisterVariable('deathmatch', '0');
  Host.coop = Cvar.RegisterVariable('coop', '0');
  Host.pausable = Cvar.RegisterVariable('pausable', '1');
  Host.temp1 = Cvar.RegisterVariable('temp1', '0');

  // dedicated server settings
  Host.dedicated = new Cvar('dedicated', dedicated ? '1' : '0', Cvar.FLAG.READONLY, 'Set to 1, if running in dedicated server mode.');

  Host.FindMaxClients();
};

Host.SendChatMessageToClient = function(client, name, message, direct = false) {
  MSG.WriteByte(client.message, Protocol.svc.chatmsg);
  MSG.WriteString(client.message, name);
  MSG.WriteString(client.message, message);
  MSG.WriteByte(client.message, direct ? 1 : 0);
};

Host.ClientPrint = function(string) { // FIXME: Host.client
  MSG.WriteByte(Host.client.message, Protocol.svc.print);
  MSG.WriteString(Host.client.message, string);
};

Host.BroadcastPrint = function(string) {
  let i; let client;
  for (i = 0; i < SV.svs.maxclients; ++i) {
    client = SV.svs.clients[i];
    if ((client.active !== true) || (client.spawned !== true)) {
      continue;
    }
    MSG.WriteByte(client.message, Protocol.svc.print);
    MSG.WriteString(client.message, string);
  }
};

Host.DropClient = function(client, crash, reason) {
  if (NET.CanSendMessage(client.netconnection) === true) {
    MSG.WriteByte(client.message, Protocol.svc.disconnect);
    MSG.WriteString(client.message, reason);
    NET.SendMessage(client.netconnection, client.message);
  }

  if (!crash) {
    if ((client.edict != null) && (client.spawned === true)) {
      const saveSelf = SV.server.gameAPI.self;
      SV.server.gameAPI.ClientDisconnect(client.edict);
      SV.server.gameAPI.self = saveSelf;
    }
    Sys.Print('Client ' + SV.GetClientName(client) + ' removed\n');
  }

  NET.Close(client.netconnection);

  client.netconnection = null;
  client.active = false;
  SV.SetClientName(client, '');
  client.old_frags = -Infinity;

  --NET.activeconnections;
  let i; const num = client.num;
  for (i = 0; i < SV.svs.maxclients; ++i) {
    client = SV.svs.clients[i];
    if (!client.active) {
      continue;
    }
    // FIXME: consolidate into a single message
    MSG.WriteByte(client.message, Protocol.svc.updatename);
    MSG.WriteByte(client.message, num);
    MSG.WriteByte(client.message, 0);
    MSG.WriteByte(client.message, Protocol.svc.updatefrags);
    MSG.WriteByte(client.message, num);
    MSG.WriteShort(client.message, 0);
    MSG.WriteByte(client.message, Protocol.svc.updatecolors);
    MSG.WriteByte(client.message, num);
    MSG.WriteByte(client.message, 0);
    MSG.WriteByte(client.message, Protocol.svc.updatepings);
    MSG.WriteByte(client.message, num);
    MSG.WriteShort(client.message, 0);
  }
};

Host.ShutdownServer = function(isCrashShutdown) { // TODO: SV duties
  if (SV.server.active !== true) {
    return;
  }
  SV.server.active = false;
  if (!Host.dedicated.value && CL.cls.state === CL.active.connected) {
    CL.Disconnect();
  }
  const start = Sys.FloatTime(); let count; let i;
  do {
    count = 0;
    for (i = 0; i < SV.svs.maxclients; ++i) {
      Host.client = SV.svs.clients[i];
      if ((Host.client.active !== true) || (Host.client.message.cursize === 0)) {
        continue;
      }
      if (NET.CanSendMessage(Host.client.netconnection) === true) {
        NET.SendMessage(Host.client.netconnection, Host.client.message);
        Host.client.message.cursize = 0;
        continue;
      }
      NET.GetMessage(Host.client.netconnection);
      ++count;
    }
    if ((Sys.FloatTime() - start) > 3.0) {
      break;
    }
  } while (count !== 0);
  // const buf = {data: new ArrayBuffer(4), cursize: 1};
  // (new Uint8Array(buf.data))[0] = Protocol.svc.disconnect;
  // count = NET.SendToAll(buf);
  // if (count !== 0) {
  //   Con.Print('Host.ShutdownServer: NET.SendToAll failed for ' + count + ' clients\n');
  // }
  for (i = 0; i < SV.svs.maxclients; ++i) {
    const client = SV.svs.clients[i];
    if (client.active) {
      Host.DropClient(client, isCrashShutdown, 'Server shutting down');
    }
  }
  SV.ShutdownServer(isCrashShutdown);
};

Host.WriteConfiguration = function() {
  Host.ScheduleInFuture('Host.WriteConfiguration', () => {
    COM.WriteTextFile('config.cfg', (!Host.dedicated.value ? Key.WriteBindings() + '\n\n\n': '') + Cvar.WriteVariables());
    Con.Print('Wrote configuration\n');
  }, 5.000);
};

Host.WriteConfiguration_f = function() {
  Con.Print('Writing configuration\n');
  Host.WriteConfiguration();
};

Host.ServerFrame = function() {
  SV.server.gameAPI.frametime = Host.frametime;
  SV.server.datagram.cursize = 0;
  SV.CheckForNewClients();
  SV.RunClients();
  if ((SV.server.paused !== true) && ((SV.svs.maxclients >= 2) || (!Host.dedicated.value && Key.dest.value === Key.dest.game))) {
    SV.Physics();
  }
  SV.RunScheduledGameCommands();
  SV.SendClientMessages();
};

Host._scheduledForNextFrame = [];
Host.ScheduleForNextFrame = function(callback) {
  Host._scheduledForNextFrame.push(callback);
};

Host._scheduleInFuture = new Map();
Host.ScheduleInFuture = function(name, callback, whenInSeconds) {
  if (Host.isdown) {
    // there’s no future when shutting down
    callback();
    return;
  }

  if (Host._scheduleInFuture.has(name)) {
    return;
  }

  Host._scheduleInFuture.set(name, {
    time: Host.realtime + whenInSeconds,
    callback,
  });
};

Host.time3 = 0.0;
Host._Frame = function() {
  // Math.random();

  Host.realtime = Sys.FloatTime();
  Host.frametime = Host.realtime - Host.oldrealtime;
  Host.oldrealtime = Host.realtime;
  if (Host.framerate.value > 0) {
    Host.frametime = Host.framerate.value;
  } else {
    if (Host.frametime > 0.1) {
      Host.frametime = 0.1;
    } else if (Host.frametime < 0.001) {
      Host.frametime = 0.001;
    }
  }

  // check all scheduled things for the next frame
  while (Host._scheduledForNextFrame.length > 0) {
    const callback = Host._scheduledForNextFrame.shift();
    callback();
  }

  // check what’s scheduled in future
  for (const [name, { time, callback }] of Host._scheduleInFuture.entries()) {
    if (time > Host.realtime) {
      continue;
    }

    callback();
    Host._scheduleInFuture.delete(name);
  }

  if (Host.dedicated.value) {
    Cmd.Execute();

    if (SV.server.active === true) {
      Host.ServerFrame();
    }

    // TODO: add times

    ++Host.framecount;

    return;
  }

  if (CL.cls.state === CL.active.connecting) {
    NET.CheckForResend();
    SCR.UpdateScreen();
    return;
  }

  let time1; let time2; let pass1; let pass2; let pass3; let tot;

  Cmd.Execute();

  if (CL.cls.state === CL.active.connected) {
    CL.ReadFromServer();
  }

  CL.SendCmd();

  if (SV.server.active === true) {
    Host.ServerFrame();
  }

  // Set up prediction for other players
  CL.SetUpPlayerPrediction(false);

  // do client side motion prediction
  CL.PredictMove();

  // Set up prediction for other players
  CL.SetUpPlayerPrediction(true);

  // build a refresh entity list
  CL.EmitEntities();

  if (Host.speeds.value !== 0) {
    time1 = Sys.FloatTime();
  }
  SCR.UpdateScreen();
  if (Host.speeds.value !== 0) {
    time2 = Sys.FloatTime();
  }

  if (CL.cls.signon === 4) {
    S.Update(R.refdef.vieworg, R.vpn, R.vright, R.vup);
    CL.DecayLights();
  } else {
    S.Update(Vector.origin, Vector.origin, Vector.origin, Vector.origin);
  }
  CDAudio.Update();

  if (Host.speeds.value !== 0) {
    pass1 = (time1 - Host.time3) * 1000.0;
    Host.time3 = Sys.FloatTime();
    pass2 = (time2 - time1) * 1000.0;
    pass3 = (Host.time3 - time2) * 1000.0;
    tot = Math.floor(pass1 + pass2 + pass3);
    Con.Print((tot <= 99 ? (tot <= 9 ? '  ' : ' ') : '') +
			tot + ' tot ' +
			(pass1 < 100.0 ? (pass1 < 10.0 ? '  ' : ' ') : '') +
			Math.floor(pass1) + ' server ' +
			(pass2 < 100.0 ? (pass2 < 10.0 ? '  ' : ' ') : '') +
			Math.floor(pass2) + ' gfx ' +
			(pass3 < 100.0 ? (pass3 < 10.0 ? '  ' : ' ') : '') +
			Math.floor(pass3) + ' snd\n');
  }

  if (Host.startdemos === true) {
    CL.NextDemo();
    Host.startdemos = false;
  }

  ++Host.framecount;
};

Host.timetotal = 0.0;
Host.timecount = 0;
Host.Frame = function() {
  if (Host.serverprofile.value === 0) {
    Host._Frame();
    return;
  }
  const time1 = Sys.FloatTime();
  Host._Frame();
  Host.timetotal += Sys.FloatTime() - time1;
  if (++Host.timecount <= 999) {
    return;
  }
  const m = (Host.timetotal * 1000.0 / Host.timecount) >> 0;
  Host.timecount = 0;
  Host.timetotal = 0.0;
  let i; let c = 0;
  for (i = 0; i < SV.svs.maxclients; ++i) {
    if (SV.svs.clients[i].active === true) {
      ++c;
    }
  }
  Con.Print('serverprofile: ' + (c <= 9 ? ' ' : '') + c + ' clients ' + (m <= 9 ? ' ' : '') + m + ' msec\n');
};

Host.Init = async function(dedicated) {
  Host.oldrealtime = Sys.FloatTime();
  Cmd.Init();

  V.Init(); // required for V.CalcRoll

  if (!dedicated) {
    Chase.Init();
  }

  await COM.Init();
  Host.InitLocal(dedicated);

  await W.LoadWadFile('gfx.wad');

  if (!dedicated) {
    Key.Init();
  }

  Con.Init();
  await PR.Init();
  Mod.Init();
  NET.Init();
  SV.Init();
  Shack.Init();

  Con.Print (`Exe: ${Def.version}\n`);

  if (!dedicated) {
    await VID.Init();
    await Draw.Init();
    SCR.Init();
    await R.Init();
    S.Init();
    await M.Init();
    CDAudio.Init();
    Sbar.Init();
    CL.Init();
    IN.Init();
  } else {
    // we need a few frontend things for dedicated
    await R.Init();
  }

  Cmd.text = 'exec better-quake.rc\n' + Cmd.text;

  Host.initialized = true;
  Sys.Print('========Quake Initialized=========\n');

  if (dedicated) {
    return;
  }

  try {
    if (parent.saveGameToUpload!=null) {
      const name = COM.DefaultExtension('s0', '.sav');
      COM.WriteTextFile(name, parent.saveGameToUpload);
    }
  } catch (err) {
    Con.DPrint(err);
  }
};

Host.Shutdown = function() {
  if (Host.isdown === true) {
    Sys.Print('recursive shutdown\n');
    return;
  }
  Host.isdown = true;
  Host.WriteConfiguration();
  if (!Host.dedicated.value) {
    S.Shutdown();
    CDAudio.Stop();
  }
  NET.Shutdown();
  if (!Host.dedicated.value) {
    IN.Shutdown();
    VID.Shutdown();
  }
  Cmd.Shutdown();
  Cvar.Shutdown();
};

// Commands

Host.Quit_f = function() {
  if (!Host.dedicated.value) {
    if (Key.dest.value !== Key.dest.console) {
      M.Menu_Quit_f();
      return;
    }
  }

  if (SV.server.active === true) {
    Host.ShutdownServer();
  }

  COM.Shutdown();
  Sys.Quit();
};

Host.Status_f = function(...argv) {
  let print;
  if (Cmd.client !== true) {
    if (SV.server.active !== true) {
      Cmd.ForwardToServer(...argv);
      return;
    }
    print = Con.Print;
  } else {
    print = Host.ClientPrint;
  }
  print('host:    ' + NET.hostname.string + '\n');
  print('version: ' + Def.version + '\n');
  print('map:     ' + SV.server.gameAPI.mapname + '\n');
  print('players: ' + NET.activeconnections + ' active (' + SV.svs.maxclients + ' max)\n\n');
  let client; let str; let frags; let hours; let minutes; let seconds;
  for (let i = 0; i < SV.svs.maxclients; ++i) {
    client = SV.svs.clients[i];
    if (!client.active) {
      continue;
    }
    frags = client.edict.entity.frags.toFixed(0);
    if (frags.length === 1) {
      frags = '  ' + frags;
    } else if (frags.length === 2) {
      frags = ' ' + frags;
    }
    seconds = (NET.time - client.netconnection.connecttime) >> 0;
    minutes = (seconds / 60) >> 0;
    if (minutes !== 0) {
      seconds -= minutes * 60;
      hours = (minutes / 60) >> 0;
      if (hours !== 0) {
        minutes -= hours * 60;
      }
    } else {
      hours = 0;
    }
    str = '#' + (i + 1) + ' ';
    if (i <= 8) {
      str += ' ';
    }
    str += SV.GetClientName(client);
    for (; str.length <= 21; ) {
      str += ' ';
    }
    str += frags + '  ';
    if (hours <= 9) {
      str += ' ';
    }
    str += hours + ':';
    if (minutes <= 9) {
      str += '0';
    }
    str += minutes + ':';
    if (seconds <= 9) {
      str += '0';
    }
    print(str + seconds + '\n');
    print('    ' + client.netconnection.address + '\n');
  }
};

Host.God_f = function(...argv) {
  if (Cmd.client !== true) {
    Cmd.ForwardToServer(...argv);
    return;
  }
  if (SV.server.gameAPI.deathmatch !== 0) {
    return;
  }
  SV.player.entity.flags ^= SV.fl.godmode;
  if ((SV.player.entity.flags & SV.fl.godmode) === 0) {
    Host.ClientPrint('godmode OFF\n');
  } else {
    Host.ClientPrint('godmode ON\n');
  }
};

Host.Notarget_f = function(...argv) {
  if (Cmd.client !== true) {
    Cmd.ForwardToServer(...argv);
    return;
  }
  if (SV.server.gameAPI.deathmatch !== 0) {
    return;
  }
  SV.player.entity.flags ^= SV.fl.notarget;
  if ((SV.player.entity.flags & SV.fl.notarget) === 0) {
    Host.ClientPrint('notarget OFF\n');
  } else {
    Host.ClientPrint('notarget ON\n');
  }
};

Host.Noclip_f = function(...argv) {
  if (Cmd.client !== true) {
    Cmd.ForwardToServer(...argv);
    return;
  }
  if (SV.server.gameAPI.deathmatch !== 0) {
    return;
  }
  if (SV.player.entity.movetype !== SV.movetype.noclip) {
    Host.noclip_anglehack = true;
    SV.player.entity.movetype = SV.movetype.noclip;
    Host.ClientPrint('noclip ON\n');
    return;
  }
  Host.noclip_anglehack = false;
  SV.player.entity.movetype = SV.movetype.walk;
  Host.ClientPrint('noclip OFF\n');
};

Host.Fly_f = function(...argv) {
  if (Cmd.client !== true) {
    Cmd.ForwardToServer(...argv);
    return;
  }
  if (SV.server.gameAPI.deathmatch !== 0) {
    return;
  }
  if (SV.player.entity.movetype !== SV.movetype.fly) {
    SV.player.entity.movetype = SV.movetype.fly;
    Host.ClientPrint('flymode ON\n');
    return;
  }
  SV.player.entity.movetype = SV.movetype.walk;
  Host.ClientPrint('flymode OFF\n');
};

Host.Ping_f = function(...argv) {
  if (Cmd.client !== true) {
    Cmd.ForwardToServer(...argv);
    return;
  }
  Host.ClientPrint('Client ping times:\n');
  let i; let client; let total; let j;
  for (i = 0; i < SV.svs.maxclients; ++i) {
    client = SV.svs.clients[i];
    if (client.active !== true) {
      continue;
    }
    total = 0;
    for (j = 0; j <= 15; ++j) {
      total += client.ping_times[j];
    }
    total = (total * 62.5).toFixed(0);
    if (total.length === 1) {
      total = '   ' + total;
    } else if (total.length === 2) {
      total = '  ' + total;
    } else if (total.length === 3) {
      total = ' ' + total;
    }
    Host.ClientPrint(total + ' ' + SV.GetClientName(client) + '\n');
  }
};

Host.Map_f = function(_, mapname, ...spawnparms) {
  if (mapname === undefined) {
    Con.Print('Usage: map <map>\n');
    return;
  }
  if (Cmd.client === true) {
    return;
  }
  if (!SV.HasMap(mapname)) {
    Con.Print(`No such map: ${mapname}\n`);
    return;
  }
  if (!Host.dedicated.value) {
    CL.cls.demonum = -1;
    CL.Disconnect();
  }
  Host.ShutdownServer(); // CR: this is the reason why you would need to use changelevel on Counter-Strike 1.6 etc.
  if (!Host.dedicated.value) {
    Key.dest.value = Key.dest.game;
    SCR.BeginLoadingPlaque();
  }
  SV.svs.serverflags = 0;

  if (!Host.dedicated.value) {
    CL.SetConnectingStep(5, 'Spawning server');
  }

  if (!Host.dedicated.value) {
    CL.cls.spawnparms = spawnparms.join(' ');
  }

  Host.ScheduleForNextFrame(() => {
    SV.SpawnServer(mapname);

    if (!Host.dedicated.value) {
      CL.SetConnectingStep(null, null);
    }

    if (SV.server.active !== true) {
      return;
    }

    if (!Host.dedicated.value) {
      Cmd.ExecuteString('connect local');
    }
  });
};

Host.Changelevel_f = function(_, mapname) {
  if (mapname === undefined) {
    Con.Print('Usage: changelevel <levelname>\n');
    return;
  }

  if ((SV.server.active !== true) || (!Host.dedicated.value && CL.cls.demoplayback === true)) {
    Con.Print('Only the server may changelevel\n');
    return;
  }

  if (!SV.HasMap(mapname)) {
    Con.Print(`No such map: ${mapname}\n`);
    return;
  }

  if (SV.svs.maxclients > 1) {
    Host.BroadcastPrint(`Changing level to ${mapname}!\n`);
  }

  if (!Host.dedicated.value) {
    CL.SetConnectingStep(5, `Changing level to ${mapname}`);
  } else {
    Con.Print(`Changing level to ${mapname}!\n`);
  }

  Host.ScheduleForNextFrame(() => {
    SV.SaveSpawnparms();
    SV.SpawnServer(mapname);
    if (!Host.dedicated.value) {
      CL.SetConnectingStep(null, null);
    }
  });
};

Host.Restart_f = function() {
  if ((SV.server.active === true) && (Host.dedicated.value || (CL.cls.demoplayback !== true) && (Cmd.client !== true))) {
    SV.SpawnServer(SV.server.gameAPI.mapname);
  }
};

Host.Reconnect_f = function() {
  if (Host.dedicated.value) {
    Con.Print('cannot reconnect in dedicated server mode\n');
    return;
  }

  SCR.BeginLoadingPlaque();
  CL.cls.signon = 0;
};

Host.Connect_f = function(_, address) {
  if (address === undefined) {
    Con.Print('Usage: connect <address>\n');
    Con.Print(' - <address> can be "self", connecting to the current domain name\n');
    return;
  }

  if (Host.dedicated.value) {
    Con.Print('cannot connect to another server in dedicated server mode\n');
    return;
  }

  CL.cls.demonum = -1;
  if (CL.cls.demoplayback === true) {
    CL.StopPlayback();
    CL.Disconnect();
  }

  if (address === 'self') {
    const url = new URL(location.href);
    CL.EstablishConnection(url.host + url.pathname + (!url.pathname.endsWith('/') ? '/' : '') + 'api/');
  } else {
    CL.EstablishConnection(address);
  }

  CL.cls.signon = 0;
};

Host.Savegame_f = function(_, savename) {
  if (Cmd.client === true) {
    return;
  }
  if (savename === undefined) {
    Con.Print('Usage: save <savename>\n');
    return;
  }
  if (SV.server.active !== true) {
    Con.Print('Not playing a local game.\n');
    return;
  }
  if (CL.state.intermission !== 0) {
    Con.Print('Can\'t save in intermission.\n');
    return;
  }
  if (SV.svs.maxclients !== 1) {
    Con.Print('Can\'t save multiplayer games.\n');
    return;
  }
  if (savename.indexOf('..') !== -1) {
    Con.Print('Relative pathnames are not allowed.\n');
    return;
  }
  const client = SV.svs.clients[0];
  if (client.active === true) {
    if (client.edict.entity.health <= 0.0) {
      Con.Print('Can\'t savegame with a dead player\n');
      return;
    }
  }

  const gamestate = {
    version: 1,
    gameversion: SV.server.gameVersion,
    comment: CL.state.levelname, // TODO: ask the game for a comment
    spawn_parms: client.spawn_parms,
    current_skill: Host.current_skill,
    mapname: SV.server.gameAPI.mapname,
    time: SV.server.time,
    lightstyles: SV.server.lightstyles,
    globals: null,
    edicts: [],
    num_edicts: SV.server.num_edicts,
  };

  // IDEA: we could actually compress this by using a list of common fields
  for (const edict of SV.server.edicts) {
    if (edict.isFree()) {
      gamestate.edicts.push(null);
      continue;
    }

    gamestate.edicts.push([edict.entity.classname, edict.entity.serialize()]);
  }

  gamestate.globals = SV.server.gameAPI.serialize();

  const name = COM.DefaultExtension(savename, '.json');
  Con.Print('Saving game to ' + name + '...\n');
  if (COM.WriteTextFile(name, JSON.stringify(gamestate))) {
    Con.Print('done.\n');
  } else {
    Con.Print('ERROR: couldn\'t open.\n');
  }
};

Host.Loadgame_f = function (_, savename) {
  if (Cmd.client === true) {
    return;
  }
  if (savename === undefined) {
    Con.Print('Usage: load <savename>\n');
    return;
  }
  CL.cls.demonum = -1;
  const name = COM.DefaultExtension(savename, '.json');
  Con.Print('Loading game from ' + name + '...\n');
  const data = COM.LoadTextFile(name);
  if (data == null) {
    Con.Print('ERROR: couldn\'t open.\n');
    return;
  }

  const gamestate = JSON.parse(data);

  if (gamestate.version !== 1) {
    Con.Print(`Savegame is version ${gamestate.version}, not 1\n`);
    return;
  }

  Host.current_skill = gamestate.current_skill;
  Cvar.SetValue('skill', Host.current_skill);

  CL.Disconnect();
  SV.SpawnServer(gamestate.mapname);

  if (!SV.server.active) {
    if (!Host.dedicated.value) {
      CL.SetConnectingStep(null, null);
    }
    Con.Print(`Couldn't load map: ${gamestate.mapname}\n`);
    return;
  }

  if (gamestate.gameversion !== SV.server.gameVersion) {
    SV.ShutdownServer(false);
    Con.Print(`Game is version ${gamestate.gameversion}, not ${SV.server.gameVersion}\n`);
    return;
  }

  SV.server.paused = true;
  SV.server.loadgame = true;

  SV.server.lightstyles = gamestate.lightstyles;
  SV.server.gameAPI.deserialize(gamestate.globals);

  SV.server.num_edicts = gamestate.num_edicts;
  console.assert(SV.server.num_edicts <= SV.server.edicts.length, 'resizing edicts not supported yet'); // TODO: alloc more edicts

  // first run through all edicts to make sure the entity structures get initialized
  for (let i = 0; i < SV.server.edicts.length; i++) {
    const edict = SV.server.edicts[i];

    if (!gamestate.edicts[i]) { // freed edict
      // FIXME: QuakeC doesn’t like it at all when edicts suddenly disappear, we should offload this code to the GameAPI
      edict.freeEdict();
      continue;
    }

    const [classname] = gamestate.edicts[i];
    console.assert(SV.server.gameAPI.prepareEntity(edict, classname), 'no entity for classname');
  }

  // second run we can start deserializing
  for (let i = 0; i < SV.server.edicts.length; i++) {
    const edict = SV.server.edicts[i];

    if (edict.isFree()) { // freed edict
      continue;
    }

    const [, data] = gamestate.edicts[i];
    edict.entity.deserialize(data);
    edict.linkEdict();
  }

  SV.server.time = gamestate.time;

  const client = SV.svs.clients[0];
  client.spawn_parms = gamestate.spawn_parms;

  CL.EstablishConnection('local');
  Host.Reconnect_f();
};

Host.Name_f = function(_, ...names) { // signon 2, step 1
  if (names.length < 1) {
    Con.Print('"name" is "' + CL.name.string + '"\n');
    return;
  }

  let newName = names.join(' ').trim().substring(0, 15);

  if (!Host.dedicated.value && Cmd.client !== true) {
    Cvar.Set('_cl_name', newName);
    if (CL.cls.state === CL.active.connected) {
      Cmd.ForwardToServer(_, ...names);
    }
    return;
  }

  const initialNewName = newName;
  let newNameCounter = 2;

  // make sure we have a somewhat unique name
  while (SV.FindClientByName(newName)) {
    newName = `${initialNewName}${newNameCounter++}`;
  }

  const name = SV.GetClientName(Host.client);
  if (Host.dedicated.value && name && (name.length !== 0) && (name !== 'unconnected') && (name !== newName)) {
    Con.Print(name + ' renamed to ' + newName + '\n');
  }

  SV.SetClientName(Host.client, newName);
  const msg = SV.server.reliable_datagram;
  MSG.WriteByte(msg, Protocol.svc.updatename);
  MSG.WriteByte(msg, Host.client.num);
  MSG.WriteString(msg, newName);
};

Host.Version_f = function() {
  Con.Print('Version ' + Def.version + '\n');
};

Host.Say = function(teamonly, message, cmd) {
  if (Cmd.client !== true) {
    Cmd.ForwardToServer(cmd, message);
    return;
  }

  if (!message) {
    return;
  }

  const save = Host.client;

  if (message.length > 140) {
    message = message.substring(0, 140) + '...';
  }

  for (let i = 0; i < SV.svs.maxclients; ++i) {
    const client = SV.svs.clients[i];
    if ((client.active !== true) || (client.spawned !== true)) {
      continue;
    }
    if ((Host.teamplay.value !== 0) && (teamonly === true) && (client.entity.team !== save.entity.team)) {
      continue;
    }
    Host.SendChatMessageToClient(client, SV.GetClientName(save), message, false);
  }

  Host.client = save; // unsure whether I removed it or not

  Con.Print(`${SV.GetClientName(save)}: ${message}\n`);
};

Host.Say_Team_f = function(_, ...args) {
  Host.Say(true, args.join(' ').trim(), _);
};

Host.Say_All_f = function(_, ...args) {
  Host.Say(false, args.join(' ').trim(), _);
};

Host.Tell_f = function(_, recipient, ...args) {
  if (Cmd.client !== true) {
    Cmd.ForwardToServer(_, recipient, ...args);
    return;
  }

  if (args.length < 2) {
    return;
  }

  let message = args.join(' ').trim();

  // Remove surrounding double quotes if present
  if (message.startsWith('"')) {
    message = message.slice(1, -1);
  }
  if (message.length > 140) {
    message = message.substring(0, 140) + '...';
  }

  const save = Host.client;
  for (let i = 0; i < SV.svs.maxclients; ++i) {
    const client = SV.svs.clients[i];
    if ((client.active !== true) || (client.spawned !== true)) {
      continue;
    }
    if (SV.GetClientName(client).toLowerCase() !== recipient.toLowerCase()) {
      continue;
    }
    Host.SendChatMessageToClient(client, SV.GetClientName(save), message, true);
    Host.SendChatMessageToClient(Host.client, SV.GetClientName(save), message, true);
    break;
  }
  Host.client = save;
};

Host.Color_f = function(...argv) { // signon 2, step 2 // FIXME: Host.client
  if (argv.length <= 1) {
    Con.Print('"color" is "' + (CL.color.value >> 4) + ' ' + (CL.color.value & 15) + '"\ncolor <0-13> [0-13]\n');
    return;
  }

  let top; let bottom;
  if (argv.length === 2) {
    top = bottom = (Q.atoi(argv[1]) & 15) >>> 0;
  } else {
    top = (Q.atoi(argv[1]) & 15) >>> 0;
    bottom = (Q.atoi(argv[2]) & 15) >>> 0;
  }
  if (top >= 14) {
    top = 13;
  }
  if (bottom >= 14) {
    bottom = 13;
  }
  const playercolor = (top << 4) + bottom;

  if (Cmd.client !== true) {
    Cvar.SetValue('_cl_color', playercolor);
    if (CL.cls.state === CL.active.connected) {
      Cmd.ForwardToServer(...argv);
    }
    return;
  }

  Host.client.colors = playercolor;
  Host.client.edict.entity.team = bottom + 1;
  const msg = SV.server.reliable_datagram;
  MSG.WriteByte(msg, Protocol.svc.updatecolors);
  MSG.WriteByte(msg, Host.client.num);
  MSG.WriteByte(msg, playercolor);
};

Host.Kill_f = function(...argv) {
  if (Cmd.client !== true) {
    Cmd.ForwardToServer(...argv);
    return;
  }
  if (SV.player.entity.health <= 0.0) {
    Host.ClientPrint('Can\'t suicide -- already dead!\n');
    return;
  }
  SV.server.gameAPI.time = SV.server.time;
  SV.server.gameAPI.ClientKill(SV.player);
};

Host.Pause_f = function(...argv) {
  if (Cmd.client !== true) {
    Cmd.ForwardToServer(...argv);
    return;
  }
  if (Host.pausable.value === 0) {
    Host.ClientPrint('Pause not allowed.\n');
    return;
  }
  SV.server.paused = !SV.server.paused;
  Host.BroadcastPrint(SV.GetClientName(Host.client) + (SV.server.paused === true ? ' paused the game\n' : ' unpaused the game\n'));
  MSG.WriteByte(SV.server.reliable_datagram, Protocol.svc.setpause);
  MSG.WriteByte(SV.server.reliable_datagram, SV.server.paused === true ? 1 : 0);
};

Host.PreSpawn_f = function() { // signon 1, step 1
  if (Cmd.client !== true) {
    Con.Print('prespawn is not valid from the console\n');
    return;
  }
  const client = Host.client;
  if (client.spawned === true) {
    Con.Print('prespawn not valid -- already spawned\n');
    return;
  }
  SZ.Write(client.message, new Uint8Array(SV.server.signon.data), SV.server.signon.cursize);
  MSG.WriteByte(client.message, Protocol.svc.signonnum);
  MSG.WriteByte(client.message, 2);
  client.sendsignon = true;
};

Host.Spawn_f = function() { // signon 2, step 3
  if (Cmd.client !== true) {
    Con.Print('spawn is not valid from the console\n');
    return;
  }
  let client = Host.client;
  if (client.spawned === true) {
    Con.Print('Spawn not valid -- already spawned\n');
    return;
  }

  let i;

  const ent = client.edict;
  if (SV.server.loadgame === true) {
    SV.server.paused = false;
  } else {
    // ent.clear(); // FIXME: there’s a weird edge case
    SV.server.gameAPI.prepareEntity(ent, 'player', {
      netname: SV.GetClientName(client),
      colormap: ent.num, // the num, not the entity
      team: (client.colors & 15) + 1,
    });
    for (i = 0; i <= 15; ++i) {
      SV.server.gameAPI[`parm${i + 1}`] = client.spawn_parms[i];
    }
    SV.server.gameAPI.time = SV.server.time;
    SV.server.gameAPI.ClientConnect(ent);
    if ((Sys.FloatTime() - client.netconnection.connecttime) <= SV.server.time) {
      Sys.Print(SV.GetClientName(client) + ' entered the game\n');
    }
    SV.server.gameAPI.PutClientInServer(ent);
  }

  const message = client.message;
  message.cursize = 0;
  MSG.WriteByte(message, Protocol.svc.time);
  MSG.WriteFloat(message, SV.server.time);
  for (i = 0; i < SV.svs.maxclients; ++i) {
    client = SV.svs.clients[i];
    MSG.WriteByte(message, Protocol.svc.updatename);
    MSG.WriteByte(message, i);
    MSG.WriteString(message, SV.GetClientName(client));
    MSG.WriteByte(message, Protocol.svc.updatefrags);
    MSG.WriteByte(message, i);
    MSG.WriteShort(message, client.old_frags);
    MSG.WriteByte(message, Protocol.svc.updatecolors);
    MSG.WriteByte(message, i);
    MSG.WriteByte(message, client.colors);
  }
  for (i = 0; i <= 63; ++i) {
    MSG.WriteByte(message, Protocol.svc.lightstyle);
    MSG.WriteByte(message, i);
    MSG.WriteString(message, SV.server.lightstyles[i]);
  }
  MSG.WriteByte(message, Protocol.svc.updatestat);
  MSG.WriteByte(message, Def.stat.totalsecrets);
  MSG.WriteLong(message, SV.server.gameAPI.total_secrets);
  MSG.WriteByte(message, Protocol.svc.updatestat);
  MSG.WriteByte(message, Def.stat.totalmonsters);
  MSG.WriteLong(message, SV.server.gameAPI.total_monsters);
  MSG.WriteByte(message, Protocol.svc.updatestat);
  MSG.WriteByte(message, Def.stat.secrets);
  MSG.WriteLong(message, SV.server.gameAPI.found_secrets);
  MSG.WriteByte(message, Protocol.svc.updatestat);
  MSG.WriteByte(message, Def.stat.monsters);
  MSG.WriteLong(message, SV.server.gameAPI.killed_monsters);
  MSG.WriteByte(message, Protocol.svc.setangle);
  const angles = ent.entity.angles;
  MSG.WriteAngle(message, angles[0]);
  MSG.WriteAngle(message, angles[1]);
  MSG.WriteAngle(message, 0.0);
  SV.WriteClientdataToMessage(ent, message);
  MSG.WriteByte(message, Protocol.svc.signonnum);
  MSG.WriteByte(message, 3);
  Host.client.sendsignon = true;
};

Host.Begin_f = function() {  // signon 3, step 1
  if (Cmd.client !== true) {
    Con.Print('begin is not valid from the console\n');
    return;
  }
  Host.client.spawned = true;
};

Host.Kick_f = function(...argv) { // FIXME: Host.client
  if (Cmd.client !== true) {
    if (SV.server.active !== true) {
      Cmd.ForwardToServer(...argv);
      return;
    }
  } else if (SV.server.gameAPI.deathmatch !== 0.0) {
    return;
  }
  if (argv.length <= 1) {
    return;
  }
  const save = Host.client;
  const s = argv[1].toLowerCase();
  let i; let byNumber;
  if ((argv.length >= 3) && (s === '#')) {
    i = Q.atoi(argv[2]) - 1;
    if ((i < 0) || (i >= SV.svs.maxclients)) {
      return;
    }
    if (SV.svs.clients[i].active !== true) {
      return;
    }
    Host.client = SV.svs.clients[i];
    byNumber = true;
  } else {
    for (i = 0; i < SV.svs.maxclients; ++i) {
      Host.client = SV.svs.clients[i];
      if (Host.client.active !== true) {
        continue;
      }
      if (SV.GetClientName(Host.client).toLowerCase() === s) {
        break;
      }
    }
  }
  if (i >= SV.svs.maxclients) {
    Host.client = save;
    return;
  }
  if (Host.client === save) {
    return;
  }
  let who;
  if (Cmd.client !== true) {
    if (Host.dedicated.value) {
      who = NET.hostname.string;
    } else {
      who = CL.name.string;
    }
  } else {
    if (Host.client === save) {
      return;
    }
    who = SV.GetClientName(save);
  }
  let message;
  if (argv.length >= 3) {
    message = COM.Parse(Cmd.args);
  }
  let dropReason = 'Kicked by ' + who;
  if (message != null) {
    let p = 0;
    if (byNumber === true) {
      ++p;
      for (; p < message.length; ++p) {
        if (message.charCodeAt(p) !== 32) {
          break;
        }
      }
      p += argv[2].length;
    }
    for (; p < message.length; ++p) {
      if (message.charCodeAt(p) !== 32) {
        break;
      }
    }
    dropReason = 'Kicked by ' + who + ': ' + message.substring(p);
  }
  Host.DropClient(Host.client, false, dropReason);
  Host.client = save;
};

Host.Give_f = function(_, classname) {
  // CR:  commented this out for now, it’s only noise…
  //      unsure if I want a “give item_shells” approach or
  //      if I want to push this piece of code into PR/PF and let
  //      the game handle this instead

  if (Cmd.client !== true) {
    Cmd.ForwardToServer(_, classname);
    return;
  }

  if (SV.server.gameAPI.deathmatch !== 0) {
    return;
  }

  if (!classname) {
    Host.ClientPrint('give <classname>\n');
    return;
  }

  const player = SV.player;

  if (!classname.startsWith('item_') && !classname.startsWith('weapon_')) {
    Host.ClientPrint('Only entity classes item_* and weapon_* are allowed!\n');
    return;
  }

  // wait for the next server frame
  SV.ScheduleGameCommand(() => {
    const { forward } = player.entity.v_angle.angleVectors();
    const origin = forward.multiply(64.0).add(player.entity.origin);

    Game.EngineInterface.SpawnEntity(classname, {
      origin,
    });
  });
  // /* old code below */
  // if ((t >= 48) && (t <= 57)) {
  //   if (COM.hipnotic !== true) {
  //     if (t >= 50) {
  //       ent.entity.items |= Def.it.shotgun << (t - 50);
  //     }
  //     return;
  //   }
  //   if (t === 54) {
  //     if (Cmd.argv[1].charCodeAt(1) === 97) {
  //       ent.entity.items |= Def.hit.proximity_gun;
  //     } else {
  //       ent.entity.items |= Def.it.grenade_launcher;
  //     }
  //     return;
  //   }
  //   if (t === 57) {
  //     ent.entity.items |= Def.hit.laser_cannon;
  //   } else if (t === 48) {
  //     ent.entity.items |= Def.hit.mjolnir;
  //   } else if (t >= 50) {
  //     ent.entity.items |= Def.it.shotgun << (t - 50);
  //   }
  //   return;
  // }
  // const v = Q.atoi(Cmd.argv[2]);
  // if (t === 104) {
  //   ent.entity.health = v;
  //   return;
  // }
  // if (COM.rogue !== true) {
  //   switch (t) {
  //     case 115:
  //       ent.entity.ammo_shells = v;
  //       return;
  //     case 110:
  //       ent.entity.ammo_nails = v;
  //       return;
  //     case 114:
  //       ent.entity.ammo_rockets = v;
  //       return;
  //     case 99:
  //       ent.entity.ammo_cells = v;
  //   }
  //   return;
  // }
  // switch (t) {
  //   case 115:
  //     if (PR.entvars.ammo_shells1 != null) {
  //       ent.v_float[PR.entvars.ammo_shells1] = v;
  //       ent.entity.ammo_shells1
  //     }
  //     ent.entity.ammo_shells = v;
  //     return;
  //   case 110:
  //     if (PR.entvars.ammo_nails1 != null) {
  //       ent.v_float[PR.entvars.ammo_nails1] = v;
  //       if (ent.entity.weapon <= Def.it.lightning) {
  //         ent.entity.ammo_nails = v;
  //       }
  //     }
  //     return;
  //   case 108:
  //     if (PR.entvars.ammo_lava_nails != null) {
  //       ent.entity.ammo_lava_nails = v;
  //       if (ent.entity.weapon > Def.it.lightning) {
  //         ent.entity.ammo_nails = v;
  //       }
  //     }
  //     return;
  //   case 114:
  //     if (PR.entvars.ammo_rockets1 != null) {
  //       ent.v_float[PR.entvars.ammo_rockets1] = v;
  //       if (ent.entity.weapon <= Def.it.lightning) {
  //         ent.entity.ammo_rockets = v;
  //       }
  //     }
  //     return;
  //   case 109:
  //     if (PR.entvars.ammo_multi_rockets != null) {
  //       ent.entity.ammo_multi_rockets = v;
  //       if (ent.entity.weapon > Def.it.lightning) {
  //         ent.entity.ammo_rockets = v;
  //       }
  //     }
  //     return;
  //   case 99:
  //     if (PR.entvars.ammo_cells1 != null) {
  //       ent.v_float[PR.entvars.ammo_cells1] = v;
  //       if (ent.entity.weapon <= Def.it.lightning) {
  //         ent.entity.ammo_cells = v;
  //       }
  //     }
  //     return;
  //   case 112:
  //     if (PR.entvars.ammo_plasma != null) {
  //       ent.entity.ammo_plasma = v;
  //       if (ent.entity.weapon > Def.it.lightning) {
  //         ent.entity.ammo_cells = v;
  //       }
  //     }
  // }
};

Host.FindViewthing = function() {
  let i; let e;
  if (SV.server.active === true) {
    for (i = 0; i < SV.server.num_edicts; ++i) {
      e = SV.server.edicts[i];
      if (e.entity.classname === 'viewthing') {
        return e;
      }
    }
  }
  Con.Print('No viewthing on map\n');
  return null;
};

Host.Viewmodel_f = function(_, model) {
  if (model === undefined) {
    Con.Print('Usage: viewmodel <model>\n');
    return;
  }
  const ent = Host.FindViewthing();
  if (ent == null) {
    return;
  }
  const m = Mod.ForName(model);
  if (m == null) {
    Con.Print('Can\'t load ' + model + '\n');
    return;
  }
  ent.entity.frame = 0;
  CL.state.model_precache[ent.entity.modelindex] = m;
};

Host.Viewframe_f = function(_, frame) {
  if (frame === undefined) {
    Con.Print('Usage: viewframe <frame>\n');
    return;
  }
  const ent = Host.FindViewthing();
  if (ent == null) {
    return;
  }
  const m = CL.state.model_precache[ent.entity.modelindex >> 0];
  let f = Q.atoi(frame);
  if (f >= m.frames.length) {
    f = m.frames.length - 1;
  }
  ent.entity.frame = f;
};

Host.Viewnext_f = function() {
  const ent = Host.FindViewthing();
  if (ent == null) {
    return;
  }
  const m = CL.state.model_precache[ent.entity.modelindex >> 0];
  let f = (ent.entity.frame >> 0) + 1;
  if (f >= m.frames.length) {
    f = m.frames.length - 1;
  }
  ent.entity.frame = f;
  Con.Print('frame ' + f + ': ' + m.frames[f].name + '\n');
};

Host.Viewprev_f = function() {
  const ent = Host.FindViewthing();
  if (ent == null) {
    return;
  }
  const m = CL.state.model_precache[ent.entity.modelindex >> 0];
  let f = (ent.entity.frame >> 0) - 1;
  if (f < 0) {
    f = 0;
  }
  ent.entity.frame = f;
  Con.Print('frame ' + f + ': ' + m.frames[f].name + '\n');
};

Host.Startdemos_f = function(_, ...demos) {
  if (Host.dedicated.value) {
    Con.Print('cannot play demos in dedicated server mode\n');
    return;
  }
  if (demos.length === 0) {
    Con.Print('Usage: startdemos <demo1> <demo2> ...\n');
    return;
  }
  Con.Print(demos.length + ' demo(s) in loop\n');
  CL.cls.demos = [...demos];
  if ((CL.cls.demonum !== -1) && (CL.cls.demoplayback !== true)) {
    CL.cls.demonum = 0;
    if (Host.framecount !== 0) {
      CL.NextDemo();
    } else {
      Host.startdemos = true;
    }
  } else {
    CL.cls.demonum = -1;
  }
};

Host.Demos_f = function() {
  if (CL.cls.demonum === -1) {
    CL.cls.demonum = 1;
  }
  CL.Disconnect();
  CL.NextDemo();
};

Host.Stopdemo_f = function() {
  if (CL.cls.demoplayback !== true) {
    return;
  }
  CL.StopPlayback();
  CL.Disconnect();
};

Host.InitCommands = function() {
  Cmd.AddCommand('status', Host.Status_f);
  Cmd.AddCommand('quit', Host.Quit_f);
  Cmd.AddCommand('god', Host.God_f);
  Cmd.AddCommand('notarget', Host.Notarget_f);
  Cmd.AddCommand('fly', Host.Fly_f);
  Cmd.AddCommand('map', Host.Map_f);
  Cmd.AddCommand('restart', Host.Restart_f);
  Cmd.AddCommand('changelevel', Host.Changelevel_f);
  Cmd.AddCommand('connect', Host.Connect_f);
  Cmd.AddCommand('reconnect', Host.Reconnect_f);
  Cmd.AddCommand('name', Host.Name_f);
  Cmd.AddCommand('noclip', Host.Noclip_f);
  Cmd.AddCommand('version', Host.Version_f);
  Cmd.AddCommand('say', Host.Say_All_f);
  Cmd.AddCommand('say_team', Host.Say_Team_f);
  Cmd.AddCommand('tell', Host.Tell_f);
  Cmd.AddCommand('color', Host.Color_f);
  Cmd.AddCommand('kill', Host.Kill_f);
  Cmd.AddCommand('pause', Host.Pause_f);
  Cmd.AddCommand('spawn', Host.Spawn_f);
  Cmd.AddCommand('begin', Host.Begin_f);
  Cmd.AddCommand('prespawn', Host.PreSpawn_f);
  Cmd.AddCommand('kick', Host.Kick_f);
  Cmd.AddCommand('ping', Host.Ping_f);
  Cmd.AddCommand('load', Host.Loadgame_f);
  Cmd.AddCommand('save', Host.Savegame_f);
  Cmd.AddCommand('give', Host.Give_f);
  Cmd.AddCommand('startdemos', Host.Startdemos_f);
  Cmd.AddCommand('demos', Host.Demos_f);
  Cmd.AddCommand('stopdemo', Host.Stopdemo_f);
  Cmd.AddCommand('viewmodel', Host.Viewmodel_f);
  Cmd.AddCommand('viewframe', Host.Viewframe_f);
  Cmd.AddCommand('viewnext', Host.Viewnext_f);
  Cmd.AddCommand('viewprev', Host.Viewprev_f);
  Cmd.AddCommand('mcache', Mod.Print);
  Cmd.AddCommand('writeconfig', Host.WriteConfiguration_f);
};
