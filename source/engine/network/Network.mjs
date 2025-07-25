import Cmd from '../common/Cmd.mjs';
import Cvar from '../common/Cvar.mjs';
import { HostError } from '../common/Errors.mjs';
import Q from '../common/Q.mjs';
import { eventBus, registry } from '../registry.mjs';
import { SzBuffer } from './MSG.mjs';
import { BaseDriver, LoopDriver, QSocket, WebSocketDriver } from './NetworkDrivers.mjs';

const NET = {};

export default NET;

let { CL, Con, Host, SV, Sys } = registry;

eventBus.subscribe('registry.frozen', () => {
  CL = registry.CL;
  Con = registry.Con;
  Host = registry.Host;
  SV = registry.SV;
  Sys = registry.Sys;
});

NET.FormatIP = function(ip, port) {
  return ip.includes(':') ? `[${ip}]:${port}` : `${ip}:${port}`;
};

NET.activeSockets = [];
NET.message = new SzBuffer(8192, 'NET.message');
NET.activeconnections = 0;
NET.listening = false;

NET.NewQSocket = function() {
  let i;
  for (i = 0; i < NET.activeSockets.length; i++) {
    if (NET.activeSockets[i].state === QSocket.STATE_DISCONNECTED) {
      break;
    }
  }
  NET.activeSockets[i] = new QSocket(NET.time, NET.driverlevel);
  return NET.activeSockets[i];
};

NET.Connect = function(host) {
  NET.time = Sys.FloatTime();

  if (host === 'local') {
    NET.driverlevel = 0; // Loop Driver
    return NET.drivers[NET.driverlevel].Connect(host);
  }

  let dfunc; let ret = null;
  for (NET.driverlevel = 1; NET.driverlevel < NET.drivers.length; ++NET.driverlevel) {
    dfunc = /** @type {BaseDriver} */ (NET.drivers[NET.driverlevel]);
    if (dfunc.initialized !== true) {
      continue;
    }
    ret = dfunc.Connect(host);
    if (ret === 0) {
      CL.cls.state = CL.active.connecting;
      Con.Print('trying...\n');
      NET.start_time = NET.time;
      NET.reps = 0;
    }
    if (ret != null) {
      return ret;
    }
  }
  return null;
};

NET.CheckForResend = function() {
  NET.time = Sys.FloatTime();
  const dfunc = NET.drivers[NET.newsocket.driver];
  if (NET.reps <= 2) {
    if ((NET.time - NET.start_time) >= (2.5 * (NET.reps + 1))) {
      Con.Print('still trying...\n');
      ++NET.reps;
    }
  } else if (NET.reps === 3) {
    if ((NET.time - NET.start_time) >= 10.0) {
      NET.Close(NET.newsocket);
      CL.cls.state = CL.active.disconnected;
      Con.Print('No Response\n');
      throw new HostError('NET.CheckForResend: connect failed\n');
    }
  }
  const ret = dfunc.CheckForResend();
  if (ret === 1) {
    // NET.newsocket.disconnected = false;
    CL.Connect(NET.newsocket);
  } else if (ret === -1) {
    // NET.newsocket.disconnected = false;
    NET.Close(NET.newsocket);
    CL.cls.state = CL.active.disconnected;
    Con.Print('Network Error\n');
    throw new HostError('NET.CheckForResend: connect failed\n');
  }

  Con.DPrint(`NET.CheckForResend: invalid CheckForResend response ${ret} by ${dfunc.constructor.name}`);
};

NET.CheckNewConnections = function() {
  NET.time = Sys.FloatTime();
  let dfunc; let ret;
  for (NET.driverlevel = 0; NET.driverlevel < NET.drivers.length; ++NET.driverlevel) {
    dfunc = NET.drivers[NET.driverlevel];
    if (dfunc.initialized !== true) {
      continue;
    }
    ret = dfunc.CheckNewConnections();
    if (ret != null) {
      return ret;
    }
  }
  return null;
};

NET.Close = function(sock) {
  if (sock == null) {
    return;
  }
  if (sock.state === QSocket.STATE_DISCONNECTED) {
    return;
  }
  NET.time = Sys.FloatTime();
  sock.Close();
};

NET.GetMessage = function(sock) {
  if (sock == null) {
    return -1;
  }
  if (sock.state === QSocket.STATE_DISCONNECTED) {
    Con.DPrint('NET.GetMessage: disconnected socket\n');
    return -1;
  }
  NET.time = Sys.FloatTime();
  const ret = sock.GetMessage();
  if (sock.driver !== 0) { // FIXME: hardcoded check for loopback driver
    if (ret === 0) {
      if ((NET.time - sock.lastMessageTime) > NET.messagetimeout.value) {
        NET.Close(sock);
        return -1;
      }
    } else if (ret > 0) {
      sock.lastMessageTime = NET.time;
    }
  }
  return ret;
};

NET.SendMessage = function(sock, data) {
  if (sock == null) {
    return -1;
  }
  if (sock.state === QSocket.STATE_DISCONNECTED) {
    Con.DPrint('NET.SendMessage: disconnected socket\n');
    return -1;
  }
  // console.debug(`NET.SendMessage: ${sock.address} ${data.cursize}`, data.toHexString());
  NET.time = Sys.FloatTime();
  return sock.SendMessage(data);
};

/**
 *
 * @param {QSocket} sock socket
 * @param {SzBuffer} data message
 * @returns
 */
NET.SendUnreliableMessage = function(sock, data) {
  if (sock === null) {
    return -1;
  }
  if (sock.state === QSocket.STATE_DISCONNECTED) {
    Con.DPrint('NET.SendUnreliableMessage: disconnected socket\n');
    return -1;
  }
  // console.debug(`NET.SendUnreliableMessage: ${sock.address} ${data.cursize}`, data.toHexString());
  NET.time = Sys.FloatTime();
  return sock.SendUnreliableMessage(data);
};

NET.CanSendMessage = function(sock) {
  if (sock == null) {
    return null;
  }
  if (sock.state === QSocket.STATE_DISCONNECTED) {
    return null;
  }
  NET.time = Sys.FloatTime();
  return sock.CanSendMessage();
};

NET.SendToAll = function(data) {
  let i; let count = 0; const state1 = []; const state2 = [];
  for (i = 0; i < SV.svs.maxclients; i++) {
    Host.client = SV.svs.clients[i];
    if (Host.client.netconnection == null) {
      continue;
    }
    if (Host.client.active !== true) {
      state1[i] = state2[i] = true;
      continue;
    }
    if (Host.client.netconnection.driver === 0) {
      NET.SendMessage(Host.client.netconnection, data);
      state1[i] = state2[i] = true;
      continue;
    }
    ++count;
    state1[i] = state2[i] = false;
  }
  const start = Sys.FloatTime();
  for (; count !== 0; ) {
    count = 0;
    for (i = 0; i < SV.svs.maxclients; i++) {
      Host.client = SV.svs.clients[i];
      if (state1[i] !== true) {
        if (NET.CanSendMessage(Host.client.netconnection)) {
          state1[i] = true;
          NET.SendMessage(Host.client.netconnection, data);
        } else {
          NET.GetMessage(Host.client.netconnection);
        }
        ++count;
        continue;
      }
      if (state2[i] !== true) {
        if (NET.CanSendMessage(Host.client.netconnection)) {
          state2[i] = true;
        } else {
          NET.GetMessage(Host.client.netconnection);
        }
        ++count;
      }
    }
    if ((Sys.FloatTime() - start) > 5.0) {
      return count;
    }
  }
  return count;
};

NET.Init = function() {
  NET.time = Sys.FloatTime();

  NET.messagetimeout = new Cvar('net_messagetimeout', '60');
  NET.hostname = new Cvar('hostname', 'UNNAMED', Cvar.FLAG.SERVER, 'Descriptive name of the server.');

  NET.delay_send = new Cvar('net_delay_send', '0', Cvar.FLAG.NONE, 'Delay sending messages to the network. Useful for debugging.');
  NET.delay_send_jitter = new Cvar('net_delay_send_jitter', '0', Cvar.FLAG.NONE, 'Jitter for the delay sending messages to the network. Useful for debugging.');

  NET.delay_receive = new Cvar('net_delay_receive', '0', Cvar.FLAG.NONE, 'Delay receiving messages from the network. Useful for debugging.');
  NET.delay_receive_jitter = new Cvar('net_delay_receive_jitter', '0', Cvar.FLAG.NONE, 'Jitter for the delay receiving messages from the network. Useful for debugging.');

  Cmd.AddCommand('maxplayers', NET.MaxPlayers_f);
  Cmd.AddCommand('listen', NET.Listen_f);
  Cmd.AddCommand('net_drivers', NET.Drivers_f);

  NET.drivers = [new LoopDriver(), new WebSocketDriver()];
  for (NET.driverlevel = 0; NET.driverlevel < NET.drivers.length; ++NET.driverlevel) {
    NET.drivers[NET.driverlevel].Init(NET.driverlevel);
  }
};

NET.Shutdown = function() {
  NET.time = Sys.FloatTime();
  for (let i = 0; i < NET.activeSockets.length; i++) {
    NET.Close(NET.activeSockets[i]);
  }
};

NET.Drivers_f = function() {
  for (const driver of NET.drivers) {
    Con.Print(`${driver.constructor.name}\n`);
    Con.Print(`...initialized: ${driver.initialized ? 'yes' : 'no'}\n`);
    Con.Print('\n');
  }
};

NET.Listen_f = function(isListening) {
  if (isListening === undefined) {
    Con.Print('"listen" is "' + (NET.listening ? 1 : 0) + '"\n');
    return;
  }

  NET.listening = isListening ? true : false;

  for (NET.driverlevel = 0; NET.driverlevel < NET.drivers.length; ++NET.driverlevel) {
    if (!NET.drivers[NET.driverlevel].initialized) {
      continue;
    }

    NET.drivers[NET.driverlevel].Listen(NET.listening);
  }
};

NET.MaxPlayers_f = function(maxplayers) {
  if (maxplayers === undefined) {
    Con.Print('"maxplayers" is "' + SV.svs.maxclients + '"\n');
    return;
  }

  if (SV.server.active) {
    Con.Print('maxplayers can not be changed while a server is running.\n');
    return;
  }

  let n = Q.atoi(maxplayers);
  if (n < 1) {
    n = 1;
  }
  if (n > SV.svs.maxclientslimit) {
    n = SV.svs.maxclientslimit;
    Con.Print('"maxplayers" set to "' + n + '"\n');
  }

  if ((n === 1) && NET.listening) {
    Cmd.ExecuteString('listen 0');
  }

  if ((n > 1) && (!NET.listening)) {
    Cmd.ExecuteString('listen 1');
  }

  SV.svs.maxclients = n;
  if (n === 1) {
    Cvar.Set('deathmatch', '0');
  } else {
    Cvar.Set('deathmatch', '1');
  }
};
