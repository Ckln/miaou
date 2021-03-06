// the !!stats command
const	stats = require('./stats.js'),
	monthstats = require('./stats-months.js');

var	miaou;

exports.init = function(_miaou){
	miaou = _miaou;
	monthstats.preloadCache(miaou.db);
}

exports.registerCommands = function(registerCommand){
	registerCommand({
		name: 'stats',
		fun: function(ct){
			return stats.doStats.call(this, ct, miaou);
		},
		help: "Usage : `!!stats [server|me|@user|users|room|roomusers|rooms|votes|...] [n]`",
		detailedHelp: "Examples:"+
			"\n* `!!stats me` : some stats about you"+
			"\n* `!!stats users` : list of the users having posted the most messages"+
			"\n* `!!stats rooms 100` : list of the 100 rooms having the most messages"+
			"\n* `!!stats @someuser` : some stats about that user"+
			"\n* `!!stats active-rooms` : list of the rooms having the most messages in last week"+
			"\n* `!!stats active-users 20` : list of the 20 users having posted the most messages in the last week"+
			"\n* `!!stats prefs` : stats of user preferences"+
			"\n* `!!stats prefs theme` : stats of user preferences regarding themes"+
			"\n* `!!stats` : basic stats"+
			"\n* `!!stats server-graph` : monthly histogram"+
			"\n* `!!stats tzoffsets` : timezone offsets"+
			"\n* `!!stats sockets` : stats about current connections"

	});
}
