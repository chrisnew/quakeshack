/* global Protocol, Vector */

// eslint-disable-next-line no-global-assign
Protocol = {};

Protocol.version = 42; // QuakeShack special version

Protocol.update_backup = 64; // power of 2
Protocol.update_mask = Protocol.update_backup - 1;

Protocol.u = {
  classname: 1 << 0,
  origin1: 1 << 1,
  origin2: 1 << 2,
  origin3: 1 << 3,
  angle2: 1 << 4,
  nolerp: 1 << 5,
  frame: 1 << 6,
  free: 1 << 7,
  angle1: 1 << 8,
  angle3: 1 << 9,
  model: 1 << 10,
  colormap: 1 << 11,
  skin: 1 << 12,
  effects: 1 << 13,
  solid: 1 << 14,
};

Protocol.su = {
  viewheight: 1,
  idealpitch: 1 << 1,
  punch1: 1 << 2,
  punch2: 1 << 3,
  punch3: 1 << 4,
  velocity1: 1 << 5,
  velocity2: 1 << 6,
  velocity3: 1 << 7,
  items: 1 << 9,
  onground: 1 << 10,
  inwater: 1 << 11,
  weaponframe: 1 << 12,
  armor: 1 << 13,
  weapon: 1 << 14,
};

Protocol.default_viewheight = 22;

/** Server to Client */
Protocol.svc = {
  null: 0,
  nop: 1,
  disconnect: 2,
  updatestat: 3,
  version: 4, // WinQuake
  setview: 5,
  sound: 6,
  time: 7, // WinQuake
  print: 8,
  stufftext: 9,
  setangle: 10,
  serverdata: 11, // QuakeWorld: serverdata
  lightstyle: 12,
  updatename: 13, // WinQuake
  updatefrags: 14,
  clientdata: 15, // WinQuake
  stopsound: 16,
  updatecolors: 17, // WinQuake
  particle: 18, // WinQuake
  damage: 19,
  spawnstatic: 20,
  spawnbinary: 21, // WinQuake
  spawnbaseline: 22,
  temp_entity: 23,
  setpause: 24,
  signonnum: 25, // WinQuake
  centerprint: 26,
  killedmonster: 27,
  foundsecret: 28,
  spawnstaticsound: 29,
  intermission: 30,
  finale: 31,
  cdtrack: 32,
  sellscreen: 33,
  cutscene: 34, // WinQuake

  // introduced in QuakeWorld:
  smallkick: 34,           // set client punchangle to 2
  bigkick: 35,             // set client punchangle to 4
  updateping: 36,          // [byte] [short]
  updateentertime: 7,      // [byte] [float]
  updatestatlong: 8,       // [byte] [long]
  muzzleflash: 39,         // [short] entity
  updateuserinfo: 0,       // [byte] slot [long] uid [string] userinfo
  download: 41,            // [short] size [size bytes]
  playerinfo: 42,          // variable
  nails: 43,               // [byte] num [48 bits] xyzpy 12 12 12 4 8
  chokecount: 44,          // [byte] packets choked
  modellist: 45,           // [strings]
  soundlist: 46,           // [strings]
  packetentities: 47,      // [...]
  deltapacketentities: 48, // [...]
  maxspeed: 49,            // maxspeed change, for prediction
  entgravity: 50,          // gravity change, for prediction
  setinfo: 51,             // setinfo on a client
  serverinfo: 52,          // serverinfo
  updatepl: 53,            // [byte] [byte]

  // QuakeShack-only:
  updatepings: 101,
  loadsound: 102,
  chatmsg: 103,
  obituary: 104,
  pmovevars: 105,
  cvar: 106,
  changelevel: 107,
};

/** Client to Server */
Protocol.clc = {
  nop: 1,
  disconnect: 2,
  move: 3,
  stringcmd: 4,
  rconcmd: 5,
  delta: 6,
  qwmove: 7,
};

Protocol.te = {
  spike: 0,
  superspike: 1,
  gunshot: 2,
  explosion: 3,
  tarexplosion: 4,
  lightning1: 5,
  lightning2: 6,
  wizspike: 7,
  knightspike: 8,
  lightning3: 9,
  lavasplash: 10,
  teleport: 11,
  explosion2: 12,
  beam: 13,
};

Protocol.button = {
  attack: 1,
  jump: 2,
  use: 4,
};

/**
 * Player flags
 */
Protocol.pf = {
  PF_MSEC: (1 << 0),
  PF_COMMAND: (1 << 1),
  PF_VELOCITY1: (1 << 2),
  PF_VELOCITY2: (1 << 3),
  PF_VELOCITY3: (1 << 4),
  PF_MODEL: (1 << 5),
  PF_SKINNUM: (1 << 6),
  PF_EFFECTS: (1 << 7),
  /** only sent for view player */
  PF_WEAPONFRAME: (1 << 8),
  /** don't block movement any more */
  PF_DEAD: (1 << 9),
  /** offset the view height differently */
  PF_GIB: (1 << 10),
  /** don't apply gravity for prediction */
  PF_NOGRAV: (1 << 11),
  /** QS: complete Vector */
  PF_VELOCITY: (1 << 12),
};

Protocol.cm = {
  CM_ANGLE1: (1<<0),
  CM_ANGLE3: (1<<1),
  CM_FORWARD: (1<<2),
  CM_SIDE: (1<<3),
  CM_UP: (1<<4),
  CM_BUTTONS: (1<<5),
  CM_IMPULSE: (1<<6),
  CM_ANGLE2: (1<<7),
};

Protocol.EntityState = class EntityState { // entity_state_t
  constructor() {
    /** @type {number} edict index */
    this.number = 0;
    /** @type {number} nolerp, etc. */
    this.flags = 0;
    this.frame = 0;
    this.modelindex = 0;
    this.colormap = 0;
    this.skinnum = 0;
    this.effects = 0;

    this.origin = new Vector();
    this.angles = new Vector();
  }
};

Protocol.UserCmd = class UserCmd { // usercmd_t
  constructor() {
    /** @type {number} maximum 255 */
    this.msec = 0;
    this.forwardmove = 0;
    this.sidemove = 0;
    this.upmove = 0;
    this.angles = new Vector();
    this.buttons = 0;
    this.impulse = 0;
  }

  /**
   * Copies the usercmd.
   * @returns {Protocol.UserCmd} copied usercmd
   */
  copy() {
    const cmd = new Protocol.UserCmd();
    cmd.msec = this.msec;
    cmd.forwardmove = this.forwardmove;
    cmd.sidemove = this.sidemove;
    cmd.upmove = this.upmove;
    cmd.angles.set(this.angles);
    cmd.buttons = this.buttons;
    cmd.impulse = this.impulse;
    return cmd;
  }

  /**
   * Sets this to the value of other.
   * @param {Protocol.UserCmd} other usercmd
   * @returns {Protocol.UserCmd} this
   */
  set(other) {
    this.msec = other.msec;
    this.forwardmove = other.forwardmove;
    this.sidemove = other.sidemove;
    this.upmove = other.upmove;
    this.angles.set(other.angles);
    this.buttons = other.buttons;
    this.impulse = other.impulse;
    return this;
  }

  /**
   * Reset command.
   * @returns {Protocol.UserCmd} this
   */
  reset() {
    this.msec = 0;
    this.forwardmove = 0;
    this.sidemove = 0;
    this.upmove = 0;
    this.angles.clear();
    this.buttons = 0;
    this.impulse = 0;
    return this;
  }

  /**
   * Tests for equality.
   * @param {Protocol.UserCmd} other other
   * @returns {boolean} true, if equal
   */
  equals(other) {
    return this.msec === other.msec &&
      this.forwardmove === other.forwardmove &&
      this.sidemove === other.sidemove &&
      this.upmove === other.upmove &&
      this.angles.equals(other.angles) && // FIXME: use epsilon?
      this.buttons === other.buttons &&
      this.impulse === other.impulse;
  }
};
