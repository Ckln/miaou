// renders tables as bar graphs in messages containing #graph
// Right now, this isn't terribly generic. I'll make it more capable
// if the need arises

miaou(function(md, plugins){

	ù.fn.textpos = function(str, x, y, align, fs){
		this.text(str).attr({x:x, y:y, textAnchor:align||"middle", alignmentBaseline:"middle"});
		if (fs) this.attr('font-size', fs+'em');
		return this;
	}

	function TGCol($table, i){
		this.rawvals = $table.find('tr td:nth-child('+(i+1)+')').map(function(){
			return $(this).text();
		}).get();
		this.name = $table.find('th:nth-child('+(i+1)+')').text();
		this.vals;
		this.valid = false;
		this.i = i;
	}
	TGCol.prototype.parse = function(parser){
		var vals = new Array(this.rawvals.length);
		for (var i=0; i<this.rawvals.length; i++) {
			vals[i]=parser(this.rawvals[i]);
			if (vals[i]===undefined) return;
		}
		this.vals = vals;
		this.valid = true;
	}
	TGCol.prototype.isAscending = function(){
		for (var i=0, n=this.vals.length; i<n; i++) {
			if ( !(this.vals[i].end > this.vals[i].start) || (i && (this.vals[i-1].end > this.vals[i].start)) ) {
				console.log("not ascending");
				return false;
			}
		}
		return true;
	}
	TGCol.prototype.hasDifferentValues = function(){
		var v = this.vals[0];
		for (var i=1, n=this.vals.length; i<n; i++) {
			if ( this.vals[i]!=v ) return true;
		}
		return false;
	}

	function min(a, b){
		if (a!=a || a==undefined) return b;
		return b<a ? b : a;
	}

	function max(a, b){
		if (a!=a || a==undefined) return b;
		return b>a ? b : a;
	}

	function legend(color){
		return `<i class=graph-legend style="background:${color}"></i>`;
	}

	var nm3 = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
	var m3 = {};
	for (var i=0; i<nm3.length; i++) m3[nm3[i]]=i+1;
	var xparsers = [
		function(s){ // jun 2015
			var m = s.match(/^(\w+)[\s\/\-]+(\d{4})$/);
			if (!m) return;
			var month = m3[m[1].toLowerCase()];
			return {
				start:(new Date(+m[2], month-1)).getTime(),
				end:(new Date(+m[2], month)).getTime(),
				label:m[1]+' '+m[2]
			};
		},
		function(s){ // 201506 or 2015/06
			var m = s.match(/^(\d{4})\s*(?:\/\s*)?(\d{2})$/);
			if (!m) return;
			return {
				start: (new Date(+m[1], m[2]-1)).getTime(),
				end: (new Date(+m[1], m[2])).getTime(),
				label: nm3[(new Date(+m[1], m[2]-1)).getMonth()]+' '+m[1]
			};
		},
		function(s){ // small sequential integers
			var d = parseInt(s.replace(/\s+/g, ""));
			if (d!==d) return;
			return {
				start: d-.5,
				end: d+.5,
				label: s
			};
		},
	];
	var colors = [
		'#e9967a', '#9cd3d3', '#e91e63', '#795548', '#8bc34a', '#00bcd4',
		'#ffc107', '#4e5050', '#317334', '#7126b1', '#ce0d08', '#959e75'
	];

	function render($c, m){
		if (!m.content) return;
		var match = m.content.match(/(?:^|\s)#graph(\([^\)]+\))?(?:$|\s)/);
		if (!match) return;
		var options= {};
		if (match[1]) {
			match[1].split(/\W+/).forEach(function(k){
				if (k) options[k] = true;
			});
		}

		var $table = $c.find('table').eq(0);
		if (!$table.length) return;
		var	xcol = new TGCol($table, 0),
			ycols = [];
		for (var ip=0; ip<xparsers.length; ip++) {
			xcol.parse(xparsers[ip]);
			if (xcol.valid) {
				if (xcol.isAscending()) break;
				else xcol.valid = false; // not valid as a x column
			}
		}
		if (!xcol.valid) {
			console.log("table : no valid x column", xcol);
			return;
		}

		for (var i=1, nbcols=$table.find('tr:first-child th').length; i<nbcols; i++) {
			var ycol = new TGCol($table, i);
			ycol.parse(function(s){
				return parseFloat(s.replace(/\s+/g, ""));
			});
			if (ycol.valid && ycol.hasDifferentValues()) ycols.push(ycol);
		}

		var	H = 230,
			nbycols = ycols.length;

		if (!nbycols) {
			console.log("no value column for #graph");
			return;
		}

		var	xvals = xcol.vals,
			availableWidth = Math.max($c.width()-120, 300),
			maxXLabelLength = Math.max.apply(0, xvals.map(function(xv){ return xv.label.length })),
			rotateXLabels = maxXLabelLength > 5,
			mt = 2, // margin top
			mr = 5, // margin right
			mb = Math.max(58, 55), // margin bottom
			ml = rotateXLabels ? 35 : 5, // margin left
			bm = 1, // space between two bars and between a bar and the border of its xval
			n = xvals.length,
			nbbars = n * nbycols,
			minXWidth = 16, // if the width is less than 15, the oblique text is too thight
			minBarWidth = Math.max((minXWidth - bm)/nbycols - bm|0, 6), //
			barWidth = Math.min(Math.max(minBarWidth, (availableWidth-ml-mr)/nbbars-bm|0), 20),
			xWidth = ((barWidth+bm)*nbycols+bm), // width of a xval
			gW = xWidth*n,
			W = gW+mr+ml,
			g = ù('<svg', $c[0]).css({ height:H, width:W }),
			miny,
			maxy,
			h = H - mb - mt,
			minsumy = 0,
			maxsumy = 0;

		ycols.forEach(function(ycol, j){
			ycol.color = colors[j%colors.length];
			$table.find("th").eq(ycol.i).append(legend(ycol.color));
			ycol.minsum = 0;
			ycol.maxsum = 0;
			var sum = 0;
			for (var i=0; i<ycol.vals.length; i++) {
				var v = ycol.vals[i];
				if (v!=v) continue;
				sum += v;
				ycol.minsum = min(sum, ycol.minsum);
				ycol.maxsum = max(sum, ycol.maxsum);
				ycol.min = min(v, ycol.min);
				ycol.max = max(v, ycol.max);
			}

			if (ycol.min>0 && ycol.min<.9*ycol.max) ycol.min = 0;
			miny = min(miny, ycol.min);
			maxy = max(maxy, ycol.max);
			minsumy = min(minsumy, ycol.minsum);
			maxsumy = max(maxsumy, ycol.maxsum);
		});

		ycols.forEach(function(ycol, j){
			if (options.compare) {
				ycol.min = miny;
				ycol.max = maxy;
				ycol.minsum = minsumy;
				ycol.maxsum = maxsumy;
			}
			var range = ycol.max-ycol.min;
			if (options.sum) range *= 1.5;
			ycol.r = h/range;
			ycol.sumr = h/(ycol.maxsum-ycol.minsum);
			ycol.sum = 0; // will be incremented during drawing
		});

		xvals.forEach(function(xval, i){
			var	x1 = ml + i*xWidth,
				x2 = x1 + xWidth,
				xm = (x1+x2)/2;
			var rect = ù('<rect', g).attr({
				class: "xval",
				x:x1, width:xWidth-1, y:0, height:h+mt, fill:"transparent", cursor:'crosshair'
			});
			$(rect.n).bubbleOn({
				html: [
					`<div class=bubble-title>${xval.label}</div>`,
					...ycols.map(c => `${legend(c.color)} ${c.name} : ${c.rawvals[i]}`)
				].join("<br>")
			});
			ycols.forEach(function(ycol, j){
				var	val = ycol.vals[i],
					y;
				if (val) ycol.sum += val;
				if (options.compare) {
					y = mt + h - Math.floor((val-miny)*ycol.r);
				} else {
					y = mt + h - Math.floor((val-ycol.min)*ycol.r);
				}
				var	height = Math.ceil(h-y+mt),
					xbar = x1+(barWidth+bm)*j;
				if (height) {
					ù('<rect', g).attr({
						x:xbar, y:y, width:barWidth, height:height,
						class: "bar", fill:ycol.color, opacity:.9
					});
				}
				if (options.sum||options["sum"+j]) {
					if (!i) {
						y = mt + h - Math.floor((0-ycol.minsum)*ycol.sumr);
						ycol.sumPath = "M"+x1+" "+y;
					}
					y = mt + h - Math.floor((ycol.sum-ycol.minsum)*ycol.sumr);
					ycol.sumPath += "L"+x2+" "+y;
				}
			});
			var	x = xm,
				y = h+mt+10;
			var text = ù('<text', g).text(xval.label).attr({
				class: "label", x:x, y:y, alignmentBaseline:"middle", fontSize:"85%", opacity:.9
			});
			if (rotateXLabels) {
				text.attr({textAnchor:"end", transform:"rotate(-45 "+x+" "+y+")"});
			}
			ù('<line', g).attr({
				x1:x1-.5, x2:x1-.5, y1:mt+h-2, y2:mt+h+1,
				stroke:"#666", strokeWidth:1
			});
		});

		ycols.forEach(function(ycol){
			if (!ycol.sumPath) return;
			ù('<path', g).attr({
				d: ycol.sumPath, fill: "transparent",
				stroke: ycol.color, opacity: .8, strokeWidth: 3, lineJoin: "round"
			});
		});

		var $tablewrap = $table.closest('.tablewrap');

		var $wrapper = $("<div class=graph-wrapper>").append(g.n).insertBefore($tablewrap);
		setTimeout(function(){
			$wrapper.scrollLeft(W)
		}, 10);

	}

	plugins.graph = {
		start: function(){
			md.registerRenderer(render, true);
		}
	}

});


