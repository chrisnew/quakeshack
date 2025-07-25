/* globalx Sbar Draw, COM, Host, CL, Cmd, SCR, Def, VID */

import Cmd from '../common/Cmd.mjs';
import { eventBus, registry } from '../registry.mjs';
import VID from './VID.mjs';
import * as Def from '../common/Def.mjs';

const Sbar = {};

export default Sbar;

let { CL, COM, Draw, Host, SCR } = registry;

eventBus.subscribe('registry.frozen', () => {
  CL = registry.CL;
  COM = registry.COM;
  Draw = registry.Draw;
  Host = registry.Host;
  SCR = registry.SCR;
});

Sbar.ShowScores = function() {
  Sbar.showscores = true;
};

Sbar.DontShowScores = function() {
  Sbar.showscores = false;
};

Sbar.Init = async function() {
  let i;

  Sbar.nums = [[], []];
  for (i = 0; i < 10; i++) {
    Sbar.nums[0][i] = Draw.LoadPicFromWad('NUM_' + i);
    Sbar.nums[1][i] = Draw.LoadPicFromWad('ANUM_' + i);
  }
  Sbar.nums[0][10] = Draw.LoadPicFromWad('NUM_MINUS');
  Sbar.nums[1][10] = Draw.LoadPicFromWad('ANUM_MINUS');
  Sbar.colon = Draw.LoadPicFromWad('NUM_COLON');
  Sbar.slash = Draw.LoadPicFromWad('NUM_SLASH');

  Sbar.weapons = [
    [
      Draw.LoadPicFromWad('INV_SHOTGUN'),
      Draw.LoadPicFromWad('INV_SSHOTGUN'),
      Draw.LoadPicFromWad('INV_NAILGUN'),
      Draw.LoadPicFromWad('INV_SNAILGUN'),
      Draw.LoadPicFromWad('INV_RLAUNCH'),
      Draw.LoadPicFromWad('INV_SRLAUNCH'),
      Draw.LoadPicFromWad('INV_LIGHTNG'),
    ],
    [
      Draw.LoadPicFromWad('INV2_SHOTGUN'),
      Draw.LoadPicFromWad('INV2_SSHOTGUN'),
      Draw.LoadPicFromWad('INV2_NAILGUN'),
      Draw.LoadPicFromWad('INV2_SNAILGUN'),
      Draw.LoadPicFromWad('INV2_RLAUNCH'),
      Draw.LoadPicFromWad('INV2_SRLAUNCH'),
      Draw.LoadPicFromWad('INV2_LIGHTNG'),
    ],
  ];
  for (i = 0; i <= 4; i++) {
    Sbar.weapons[2 + i] = [
      Draw.LoadPicFromWad('INVA' + (i + 1) + '_SHOTGUN'),
      Draw.LoadPicFromWad('INVA' + (i + 1) + '_SSHOTGUN'),
      Draw.LoadPicFromWad('INVA' + (i + 1) + '_NAILGUN'),
      Draw.LoadPicFromWad('INVA' + (i + 1) + '_SNAILGUN'),
      Draw.LoadPicFromWad('INVA' + (i + 1) + '_RLAUNCH'),
      Draw.LoadPicFromWad('INVA' + (i + 1) + '_SRLAUNCH'),
      Draw.LoadPicFromWad('INVA' + (i + 1) + '_LIGHTNG'),
    ];
  }

  Sbar.ammo = [
    Draw.LoadPicFromWad('SB_SHELLS'),
    Draw.LoadPicFromWad('SB_NAILS'),
    Draw.LoadPicFromWad('SB_ROCKET'),
    Draw.LoadPicFromWad('SB_CELLS'),
  ];

  Sbar.armor = [
    Draw.LoadPicFromWad('SB_ARMOR1'),
    Draw.LoadPicFromWad('SB_ARMOR2'),
    Draw.LoadPicFromWad('SB_ARMOR3'),
  ];

  Sbar.items = [
    Draw.LoadPicFromWad('SB_KEY1'),
    Draw.LoadPicFromWad('SB_KEY2'),
    Draw.LoadPicFromWad('SB_INVIS'),
    Draw.LoadPicFromWad('SB_INVULN'),
    Draw.LoadPicFromWad('SB_SUIT'),
    Draw.LoadPicFromWad('SB_QUAD'),
  ];

  Sbar.sigil = [
    Draw.LoadPicFromWad('SB_SIGIL1'),
    Draw.LoadPicFromWad('SB_SIGIL2'),
    Draw.LoadPicFromWad('SB_SIGIL3'),
    Draw.LoadPicFromWad('SB_SIGIL4'),
  ];

  Sbar.faces = [];
  for (i = 0; i <= 4; i++) {
    Sbar.faces[i] = [
      Draw.LoadPicFromWad('FACE' + (5 - i)),
      Draw.LoadPicFromWad('FACE_P' + (5 - i)),
    ];
  }
  Sbar.face_invis = Draw.LoadPicFromWad('FACE_INVIS');
  Sbar.face_invuln = Draw.LoadPicFromWad('FACE_INVUL2');
  Sbar.face_invis_invuln = Draw.LoadPicFromWad('FACE_INV2');
  Sbar.face_quad = Draw.LoadPicFromWad('FACE_QUAD');

  Cmd.AddCommand('+showscores', Sbar.ShowScores);
  Cmd.AddCommand('-showscores', Sbar.DontShowScores);

  Sbar.sbar = Draw.LoadPicFromWad('SBAR');
  Sbar.ibar = Draw.LoadPicFromWad('IBAR');
  Sbar.scorebar = Draw.LoadPicFromWad('SCOREBAR');

  Sbar.ranking = await Draw.LoadPicFromLump('ranking');
  Sbar.complete = await Draw.LoadPicFromLump('complete');
  Sbar.inter = await Draw.LoadPicFromLump('inter');
  Sbar.finale = await Draw.LoadPicFromLump('finale');

  Sbar.disc = Draw.LoadPicFromWad('DISC');

  if (COM.hipnotic === true) {
    Sbar.h_weapons = [[
      Draw.LoadPicFromWad('INV_LASER'),
      Draw.LoadPicFromWad('INV_MJOLNIR'),
      Draw.LoadPicFromWad('INV_GREN_PROX'),
      Draw.LoadPicFromWad('INV_PROX_GREN'),
      Draw.LoadPicFromWad('INV_PROX'),
    ],
    [
      Draw.LoadPicFromWad('INV2_LASER'),
      Draw.LoadPicFromWad('INV2_MJOLNIR'),
      Draw.LoadPicFromWad('INV2_GREN_PROX'),
      Draw.LoadPicFromWad('INV2_PROX_GREN'),
      Draw.LoadPicFromWad('INV2_PROX'),
    ]];
    for (i = 0; i <= 4; i++) {
      Sbar.h_weapons[2 + i] = [
        Draw.LoadPicFromWad('INVA' + (i + 1) + '_LASER'),
        Draw.LoadPicFromWad('INVA' + (i + 1) + '_MJOLNIR'),
        Draw.LoadPicFromWad('INVA' + (i + 1) + '_GREN_PROX'),
        Draw.LoadPicFromWad('INVA' + (i + 1) + '_PROX_GREN'),
        Draw.LoadPicFromWad('INVA' + (i + 1) + '_PROX'),
      ];
    }
    Sbar.hipweapons = [Def.hit.laser_cannon_bit, Def.hit.mjolnir_bit, 4, Def.hit.proximity_gun_bit];
    Sbar.h_items = [
      Draw.LoadPicFromWad('SB_WSUIT'),
      Draw.LoadPicFromWad('SB_ESHLD'),
    ];
  } else if (COM.rogue === true) {
    Sbar.r_invbar = [
      Draw.LoadPicFromWad('R_INVBAR1'),
      Draw.LoadPicFromWad('R_INVBAR2'),
    ];
    Sbar.r_weapons = [
      Draw.LoadPicFromWad('R_LAVA'),
      Draw.LoadPicFromWad('R_SUPERLAVA'),
      Draw.LoadPicFromWad('R_GREN'),
      Draw.LoadPicFromWad('R_MULTIROCK'),
      Draw.LoadPicFromWad('R_PLASMA'),
    ];
    Sbar.r_items = [
      Draw.LoadPicFromWad('R_SHIELD1'),
      Draw.LoadPicFromWad('R_AGRAV1'),
    ];
    Sbar.r_teambord = Draw.LoadPicFromWad('R_TEAMBORD');
    Sbar.r_ammo = [
      Draw.LoadPicFromWad('R_AMMOLAVA'),
      Draw.LoadPicFromWad('R_AMMOMULTI'),
      Draw.LoadPicFromWad('R_AMMOPLASMA'),
    ];
  }
};

Sbar.DrawPic = function(x, y, pic) {
  if (CL.state.maxclients > 1) {
    Draw.Pic(x, y + VID.height - 24, pic);
  } else {
    Draw.Pic(x + (VID.width >> 1) - 160, y + VID.height - 24, pic);
  }
};

Sbar.DrawCharacter = function(x, y, num) {
  if (CL.state.maxclients > 1) {
    Draw.Character(x + 4, y + VID.height - 24, num);
  } else {
    Draw.Character(x + (VID.width >> 1) - 156, y + VID.height - 24, num);
  }
};

Sbar.DrawString = function(x, y, str) {
  if (CL.state.maxclients > 1) {
    Draw.String(x, y + VID.height - 24, str);
  } else {
    Draw.String(x + (VID.width >> 1) - 160, y + VID.height - 24, str);
  }
};

Sbar.DrawNum = function(x, y, num, digits, color) {
  let str = num.toString();
  if (str.length > digits) {
    str = str.substring(str.length - digits, str.length);
  } else if (str.length < digits) {
    x += (digits - str.length) * 24;
  }
  let i; let frame;
  for (i = 0; i < str.length; i++) {
    frame = str.charCodeAt(i);
    Sbar.DrawPic(x, y, Sbar.nums[color][frame === 45 ? 10 : frame - 48]);
    x += 24;
  }
};

Sbar.fragsort = [];

Sbar.SortFrags = function() {
  Sbar.scoreboardlines = 0;
  let i; let j; let k;
  for (i = 0; i < CL.state.maxclients; i++) {
    if (CL.state.scores[i].name.length !== 0) {
      Sbar.fragsort[Sbar.scoreboardlines++] = i;
    }
  }
  // CR: this could have been one .sort() call…
  for (i = 0; i < Sbar.scoreboardlines; i++) {
    for (j = 0; j < (Sbar.scoreboardlines - 1 - i); j++) {
      if (CL.state.scores[Sbar.fragsort[j]].frags < CL.state.scores[Sbar.fragsort[j + 1]].frags) {
        k = Sbar.fragsort[j];
        Sbar.fragsort[j] = Sbar.fragsort[j + 1];
        Sbar.fragsort[j + 1] = k;
      }
    }
  }
};

Sbar.SoloScoreboard = function() {
  let str;

  Sbar.DrawString(8, 4, 'Monsters:    /');
  str = CL.state.stats[Def.stat.monsters].toString();
  Sbar.DrawString(104 - (str.length << 3), 4, str);
  str = CL.state.stats[Def.stat.totalmonsters].toString();
  Sbar.DrawString(144 - (str.length << 3), 4, str);

  Sbar.DrawString(8, 12, 'Secrets :    /');
  str = CL.state.stats[Def.stat.secrets].toString();
  Sbar.DrawString(104 - (str.length << 3), 12, str);
  str = CL.state.stats[Def.stat.totalsecrets].toString();
  Sbar.DrawString(144 - (str.length << 3), 12, str);

  const minutes = Math.floor(CL.state.time / 60.0);
  const seconds = Math.floor(CL.state.time - 60 * minutes);
  const tens = Math.floor(seconds / 10.0);
  str = (seconds - 10 * tens).toString();
  Sbar.DrawString(184, 4, 'Time :   :' + tens + str);
  str = minutes.toString();
  Sbar.DrawString(256 - (str.length << 3), 4, str);

  Sbar.DrawString(232 - (CL.state.levelname.length << 2), 12, CL.state.levelname);
};

Sbar.DrawInventory = function() {
  let i;

  if (COM.rogue === true) {
    Sbar.DrawPic(0, -24, Sbar.r_invbar[CL.state.stats[Def.stat.activeweapon] >= Def.rit.lava_nailgun ? 0 : 1]);
  } else {
    Sbar.DrawPic(0, -24, Sbar.ibar);
  }

  let flashon;
  for (i = 0; i <= 6; i++) {
    if ((CL.state.items & (Def.it.shotgun << i)) === 0) {
      continue;
    }
    flashon = Math.floor((CL.state.time - CL.state.item_gettime[i]) * 10.0);
    if (flashon >= 10) {
      flashon = CL.state.stats[Def.stat.activeweapon] === (Def.it.shotgun << i) ? 1 : 0;
    } else {
      flashon = (flashon % 5) + 2;
    }
    Sbar.DrawPic(i * 24, -16, Sbar.weapons[flashon][i]);
  }
  if (COM.hipnotic === true) {
    let grenadeflashing = false;
    for (i = 0; i <= 3; i++) {
      if ((CL.state.items & (1 << Sbar.hipweapons[i])) !== 0) {
        flashon = Math.floor((CL.state.time - CL.state.item_gettime[i]) * 10.0);
        if (flashon >= 10) {
          flashon = CL.state.stats[Def.stat.activeweapon] === (1 << Sbar.hipweapons[i]) ? 1 : 0;
        } else {
          flashon = (flashon % 5) + 2;
        }

        if (i === 2) {
          if (((CL.state.items & Def.hit.proximity_gun) !== 0) && (flashon !== 0)) {
            grenadeflashing = true;
            Sbar.DrawPic(96, -16, Sbar.h_weapons[flashon][2]);
          }
        } else if (i === 3) {
          if ((CL.state.items & Def.it.grenade_launcher) !== 0) {
            if (grenadeflashing !== true) {
              Sbar.DrawPic(96, -16, Sbar.h_weapons[flashon][3]);
            }
          } else {
            Sbar.DrawPic(96, -16, Sbar.h_weapons[flashon][4]);
          }
        } else {
          Sbar.DrawPic(176 + i * 24, -16, Sbar.h_weapons[flashon][i]);
        }
      }
    }
  } else if (COM.rogue === true) {
    if (CL.state.stats[Def.stat.activeweapon] >= Def.rit.lava_nailgun) {
      for (i = 0; i <= 4; i++) {
        if (CL.state.stats[Def.stat.activeweapon] === (Def.rit.lava_nailgun << i)) {
          Sbar.DrawPic((i + 2) * 24, -16, Sbar.r_weapons[i]);
        }
      }
    }
  }

  for (i = 0; i <= 3; i++) {
    const num = CL.state.stats[Def.stat.shells + i].toString();
    switch (num.length) {
      case 1:
        Sbar.DrawCharacter(((6 * i + 3) << 3) - 2, -24, num.charCodeAt(0) - 30);
        continue;
      case 2:
        Sbar.DrawCharacter(((6 * i + 2) << 3) - 2, -24, num.charCodeAt(0) - 30);
        Sbar.DrawCharacter(((6 * i + 3) << 3) - 2, -24, num.charCodeAt(1) - 30);
        continue;
      case 3:
        Sbar.DrawCharacter(((6 * i + 1) << 3) - 2, -24, num.charCodeAt(0) - 30);
        Sbar.DrawCharacter(((6 * i + 2) << 3) - 2, -24, num.charCodeAt(1) - 30);
        Sbar.DrawCharacter(((6 * i + 3) << 3) - 2, -24, num.charCodeAt(2) - 30);
    }
  }

  if (COM.hipnotic === true) {
    for (i = 2; i <= 5; i++) {
      if ((CL.state.items & (1 << (17 + i))) !== 0) {
        Sbar.DrawPic(192 + (i << 4), -16, Sbar.items[i]);
      }
    }
    if ((CL.state.items & 16777216) !== 0) {
      Sbar.DrawPic(288, -16, Sbar.h_items[0]);
    }
    if ((CL.state.items & 33554432) !== 0) {
      Sbar.DrawPic(304, -16, Sbar.h_items[1]);
    }
  } else {
    for (i = 0; i <= 5; i++) {
      if ((CL.state.items & (1 << (17 + i))) !== 0) {
        Sbar.DrawPic(192 + (i << 4), -16, Sbar.items[i]);
      }
    }
    if (COM.rogue === true) {
      if ((CL.state.items & 536870912) !== 0) {
        Sbar.DrawPic(288, -16, Sbar.r_items[0]);
      }
      if ((CL.state.items & 1073741824) !== 0) {
        Sbar.DrawPic(304, -16, Sbar.r_items[1]);
      }
    } else {
      for (i = 0; i <= 3; i++) {
        if (((CL.state.items >>> (28 + i)) & 1) !== 0) {
          Sbar.DrawPic(288 + (i << 3), -16, Sbar.sigil[i]);
        }
      }
    }
  }
};

Sbar.DrawFrags = function() {
  Sbar.SortFrags();
  const l = Sbar.scoreboardlines <= 4 ? Sbar.scoreboardlines : 4;
  let x = 23;
  const xofs = CL.state.maxclients === 1 ? 10 : (VID.width >> 1) - 150;
  const y = VID.height - 47;
  let i; let k; let s; let num;
  for (i = 0; i < l; i++) {
    k = Sbar.fragsort[i];
    s = CL.state.scores[k];
    if (s.name.length === 0) {
      continue;
    }
    Draw.FillIndexed(xofs + (x << 3), y, 28, 4, (s.colors & 0xf0) + 8);
    Draw.FillIndexed(xofs + (x << 3), y + 4, 28, 3, ((s.colors & 0xf) << 4) + 8);
    num = s.frags.toString();
    Sbar.DrawString(((x - num.length) << 3) + 36, -24, num);
    if (k === (CL.state.viewentity - 1)) {
      Sbar.DrawCharacter((x << 3) + 2, -24, 16);
      Sbar.DrawCharacter((x << 3) + 28, -24, 17);
    }
    x += 4;
  }
};

Sbar.DrawFace = function() {
  if ((COM.rogue === true) && (CL.state.maxclients !== 1) && (Host.teamplay.value >= 4) && (Host.teamplay.value <= 6)) {
    const s = CL.state.scores[CL.state.viewentity - 1];
    const top = (s.colors & 0xf0) + 8;
    const xofs = CL.state.maxclients === 1 ? 113 : (VID.width >> 1) - 47;
    Sbar.DrawPic(112, 0, Sbar.r_teambord);
    Draw.FillIndexed(xofs, VID.height - 21, 22, 9, top);
    Draw.FillIndexed(xofs, VID.height - 12, 22, 9, ((s.colors & 0xf) << 4) + 8);
    let num = (top === 8 ? '\x3e\x3e\x3e' : '   ') + s.frags;
    if (num.length > 3) {
      num = num.substring(num.length - 3);
    }
    if (top === 8) {
      Sbar.DrawCharacter(109, 3, num.charCodeAt(0) - 30);
      Sbar.DrawCharacter(116, 3, num.charCodeAt(1) - 30);
      Sbar.DrawCharacter(123, 3, num.charCodeAt(2) - 30);
    } else {
      Sbar.DrawCharacter(109, 3, num.charCodeAt(0));
      Sbar.DrawCharacter(116, 3, num.charCodeAt(1));
      Sbar.DrawCharacter(123, 3, num.charCodeAt(2));
    }
    return;
  }

  if ((CL.state.items & (Def.it.invisibility + Def.it.invulnerability)) === (Def.it.invisibility + Def.it.invulnerability)) {
    Sbar.DrawPic(112, 0, Sbar.face_invis_invuln);
    return;
  }
  if ((CL.state.items & Def.it.quad) !== 0) {
    Sbar.DrawPic(112, 0, Sbar.face_quad);
    return;
  }
  if ((CL.state.items & Def.it.invisibility) !== 0) {
    Sbar.DrawPic(112, 0, Sbar.face_invis);
    return;
  }
  if ((CL.state.items & Def.it.invulnerability) !== 0) {
    Sbar.DrawPic(112, 0, Sbar.face_invuln);
    return;
  }
  Sbar.DrawPic(112, 0, Sbar.faces[CL.state.stats[Def.stat.health] >= 100.0 ? 4 : Math.floor(CL.state.stats[Def.stat.health] / 20.0)][CL.state.time <= CL.state.faceanimtime ? 1 : 0]);
};

Sbar.Draw = function() {
  if (SCR.con_current >= 200) {
    return;
  }

  if (Sbar.lines > 24) {
    Sbar.DrawInventory();
    // if (CL.state.maxclients !== 1) {
    //   Sbar.DrawFrags();
    // }
  }

  if ((Sbar.showscores === true) || (CL.state.stats[Def.stat.health] <= 0)) {
    Sbar.DrawPic(0, 0, Sbar.scorebar);
    Sbar.SoloScoreboard();
    if (CL.state.maxclients > 1) {
      Sbar.DeathmatchOverlay();
    }
    return;
  }

  if (Sbar.lines === 0) {
    return;
  }

  Sbar.DrawPic(0, 0, Sbar.sbar);

  if (COM.hipnotic === true) {
    if ((CL.state.items & Def.it.key1) !== 0) {
      Sbar.DrawPic(209, 3, Sbar.items[0]);
    }
    if ((CL.state.items & Def.it.key2) !== 0) {
      Sbar.DrawPic(209, 12, Sbar.items[1]);
    }
  }

  const it = (COM.rogue === true) ? Def.rit : Def.it;

  if ((CL.state.items & Def.it.invulnerability) !== 0) {
    Sbar.DrawNum(24, 0, 666, 3, 1);
    Sbar.DrawPic(0, 0, Sbar.disc);
  } else {
    Sbar.DrawNum(24, 0, CL.state.stats[Def.stat.armor], 3, CL.state.stats[Def.stat.armor] <= 25 ? 1 : 0);
    if ((CL.state.items & it.armor3) !== 0) {
      Sbar.DrawPic(0, 0, Sbar.armor[2]);
    } else if ((CL.state.items & it.armor2) !== 0) {
      Sbar.DrawPic(0, 0, Sbar.armor[1]);
    } else if ((CL.state.items & it.armor1) !== 0) {
      Sbar.DrawPic(0, 0, Sbar.armor[0]);
    }
  }

  Sbar.DrawFace();

  Sbar.DrawNum(136, 0, CL.state.stats[Def.stat.health], 3, CL.state.stats[Def.stat.health] <= 25 ? 1 : 0);

  if ((CL.state.items & it.shells) !== 0) {
    Sbar.DrawPic(224, 0, Sbar.ammo[0]);
  } else if ((CL.state.items & it.nails) !== 0) {
    Sbar.DrawPic(224, 0, Sbar.ammo[1]);
  } else if ((CL.state.items & it.rockets) !== 0) {
    Sbar.DrawPic(224, 0, Sbar.ammo[2]);
  } else if ((CL.state.items & it.cells) !== 0) {
    Sbar.DrawPic(224, 0, Sbar.ammo[3]);
  } else if (COM.rogue === true) {
    if ((CL.state.items & Def.rit.lava_nails) !== 0) {
      Sbar.DrawPic(224, 0, Sbar.r_ammo[0]);
    } else if ((CL.state.items & Def.rit.plasma_ammo) !== 0) {
      Sbar.DrawPic(224, 0, Sbar.r_ammo[1]);
    } else if ((CL.state.items & Def.rit.multi_rockets) !== 0) {
      Sbar.DrawPic(224, 0, Sbar.r_ammo[2]);
    }
  }
  Sbar.DrawNum(248, 0, CL.state.stats[Def.stat.ammo], 3, CL.state.stats[Def.stat.ammo] <= 10 ? 1 : 0);

  if ((VID.width >= 512) && (CL.state.maxclients > 1)) {
    Sbar.MiniDeathmatchOverlay();
  }

  if ((VID.width >= 768) && (CL.state.maxclients > 1)) {
    Sbar.ChatterDrawOverlay();
  }
};

Sbar.IntermissionNumber = function(x, y, num) {
  let str = num.toString();
  if (str.length > 3) {
    str = str.substring(str.length - 3, str.length);
  } else if (str.length < 3) {
    x += (3 - str.length) * 24;
  }
  let i; let frame;
  for (i = 0; i < str.length; i++) {
    frame = str.charCodeAt(i);
    Draw.Pic(x, y, Sbar.nums[0][frame === 45 ? 10 : frame - 48]);
    x += 24;
  }
};

// draws the score board when pressing down TAB
Sbar.DeathmatchOverlay = function() {
  Draw.Pic((VID.width - Sbar.ranking.width) / 2, 8, Sbar.ranking);
  Sbar.SortFrags();

  const x = (VID.width / 2) - 80; let y = 40;

  for (let i = 0; i < Sbar.scoreboardlines; i++) {
    const s = CL.state.scores[Sbar.fragsort[i]];
    if (s.name.length === 0) {
      continue;
    }
    Draw.FillIndexed(x, y, 40, 4, (s.colors & 0xf0) + 8);
    Draw.FillIndexed(x, y + 4, 40, 4, ((s.colors & 0xf) * 16) + 8);
    const f = s.frags.toString();
    Draw.String(x + 32 - (f.length * 8), y, f);
    if (Sbar.fragsort[i] === (CL.state.viewentity - 1)) {
      Draw.Character(x - 8, y, 12);
    }
    Draw.String(x + 64, y, s.name);
    Draw.String(x + 64 + 18 * 8, y, `(${s.ping.toFixed(1)} ms)`);
    y += 10;
  }
};

// draws the mini overlay inside the Sbar
Sbar.MiniDeathmatchOverlay = function() {
  Sbar.SortFrags();
  const l = Sbar.scoreboardlines;
  let y = VID.height - Sbar.lines;
  const numlines = Sbar.lines * 8;
  let i;

  for (i = 0; i < l; i++) {
    if (Sbar.fragsort[i] === (CL.state.viewentity - 1)) {
      break;
    }
  }

  i = (i === l) ? 0 : i - (numlines * 2);
  if (i > (l - numlines)) {
    i = l - numlines;
  }
  if (i < 0) {
    i = 0;
  }

  for (let k, s, num; (i < l) && (y < (VID.height - 8)); i++) { // 24 chars per column
    k = Sbar.fragsort[i];
    s = CL.state.scores[k];
    if (s.name.length === 0) {
      continue;
    }
    Draw.FillIndexed(324, y + 1, 40, 3, (s.colors & 0xf0) + 8);
    Draw.FillIndexed(324, y + 4, 40, 4, ((s.colors & 0xf) << 4) + 8);
    num = s.frags.toString();
    Draw.String(356 - (num.length << 3), y, num);
    if (k === (CL.state.viewentity - 1)) {
      Draw.Character(324, y, 16);
      Draw.Character(356, y, 17);
    }
    Draw.String(372, y, s.name);
    y += 8;
  }
};

Sbar.ChatterDrawOverlay = function() {
  const messages = CL.state.chatlog;
  const x = 372 + 132;

  for (let i = Math.max(0, messages.length - (Sbar.lines / 8)), y = VID.height - Sbar.lines; y < (VID.height) && i < messages.length; y+=8, i++) {
    const {name, message, direct} = messages[i];
    if (direct) {
      Draw.String(x, y, `${name}: ${message}`);
    } else {
      Draw.StringWhite(x, y, `${name}: ${message}`);
    }
  }
};

Sbar.IntermissionOverlay = function() {
  if (CL.state.maxclients > 1) {
    Sbar.DeathmatchOverlay();
    return;
  }
  Draw.Pic(64, 24, Sbar.complete);
  Draw.Pic(0, 56, Sbar.inter);

  const dig = Math.floor(CL.state.completed_time / 60.0);
  Sbar.IntermissionNumber(160, 64, dig);
  const num = Math.floor(CL.state.completed_time - dig * 60);
  Draw.Pic(234, 64, Sbar.colon);
  Draw.Pic(246, 64, Sbar.nums[0][Math.floor(num / 10)]);
  Draw.Pic(266, 64, Sbar.nums[0][Math.floor(num % 10)]);

  Sbar.IntermissionNumber(160, 104, CL.state.stats[Def.stat.secrets]);
  Draw.Pic(232, 104, Sbar.slash);
  Sbar.IntermissionNumber(240, 104, CL.state.stats[Def.stat.totalsecrets]);

  Sbar.IntermissionNumber(160, 144, CL.state.stats[Def.stat.monsters]);
  Draw.Pic(232, 144, Sbar.slash);
  Sbar.IntermissionNumber(240, 144, CL.state.stats[Def.stat.totalmonsters]);
};

Sbar.FinaleOverlay = function() {
  Draw.Pic((VID.width - Sbar.finale.width) >> 1, 16, Sbar.finale);
};
