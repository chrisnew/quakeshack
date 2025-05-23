/* global Sys */
require('./source/Draw_node.js');
require('./source/Sys_node.js');
require('./source/Vec.js');
require('./source/CRC.js');
require('./source/COM.js');
require('./source/COM_node.js');
require('./source/Console.js');
require('./source/Mod.js');
require('./source/Protocol.js');
require('./source/Pmove.js');
require('./source/MSG.js');
require('./source/SV.js');
require('./source/W.js');
require('./source/ED.js');
require('./source/Game.js');
require('./source/PR.js');
require('./source/PF.js');
require('./source/Def.js');
require('./source/Cmd.js');
require('./source/Cvar.js');
require('./source/Host.js');
require('./source/R.js'); // required for avertexnormals and notexture_mip
require('./source/Q.js');
require('./source/V.js'); // required for V.CalcRoll
require('./source/VID.js');
require('./source/NET.js');
require('./source/NET_Loop.js');
require('./source/NET_WEBS.js');
require('./source/Shack.js');

Sys.Init().then(() => Sys.Print('Dedicated server initialized!\n'));
