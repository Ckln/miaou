const	fs = require('fs'),
	path = require('path'),
	auths = require('./auths.js'),
	prefs = require('./prefs.js'),
	server = require('./server.js');

var	clientSidePluginNames,
	accessRequestPlugins,
	features,
	db;

exports.configure = function(miaou){
	clientSidePluginNames = (miaou.config.plugins||[]).filter(function(n){
		return fs.existsSync(path.resolve(__dirname, '..', n, '..', 'client-scripts'))
	}).map(p=>p.split('/').slice(-2, -1)[0]);
	accessRequestPlugins = miaou.plugins.filter(p => p.beforeAccessRequest);
	features = {
		search: {
			regularExpressions: miaou.conf("search", "regularExpressions"),
			exactExpressions: miaou.conf("search", "exactExpressions")
		}
	};
	db = miaou.db;
	return this;
}

exports.appGet = function(req, res){
	let	roomId = +req.params[0],
		userId = req.user.id;
	if (!roomId) {
		// not an error as it happens when there's no room id in url
		res.redirect(server.url('/rooms'));
		return;
	}
	db.do(async function(con){
		let room = await con.fetchRoomAndUserAuth(roomId, userId);
		if (!room) throw new Error("No room with id " + roomId);
		room.path = server.roomPath(room);
		req.session.room = room;
		let	userPrefs = await prefs.get(con, userId),
			isMobile = server.mobile(req),
			theme = prefs.theme(userPrefs, req.query.theme, isMobile);
		let ban = await con.getRoomUserActiveBan(roomId, userId);
		if (ban || (room.private && !auths.checkAtLeast(room.auth, 'write'))) {
			let lastAccessRequest = await con.getLastAccessRequest(roomId, userId);
			let args = {
				vars: { room },
				room,
				lastAccessRequest,
				theme,
				canQueryAccess: true,
				specificMessage: null
			};
			for (let i=0; i<accessRequestPlugins.length; i++) {
				args = await accessRequestPlugins[i].beforeAccessRequest(args, req.user);
			}
			res.render("request.pug", args);
			return;
		}
		let locals = {
			me: req.user,
			room,
			userPrefs,
			features,
			pluginsToStart: clientSidePluginNames
		};
		res.render(isMobile ? 'pad.mob.pug' : 'pad.pug', {vars:locals, theme});
	}, function(err){
		server.renderErr(res, err);
	});
}
