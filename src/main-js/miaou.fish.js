// makes bubbles
;miaou(function(fish, fmt, gui){

	$.fn.bubble = function(options){
		var	side,
			match,
			css,
			targetRect = this[0].getBoundingClientRect(),
			ww = $(window).width(),
			wh = $(window).height(),
			$b = $('<div>').addClass('bubble').appendTo(document.body),
			$c = $('<div>').addClass('bubble-content').appendTo($b);
		if (options.classes) $b.addClass(options.classes);
		$('<div>').addClass('bubble-arrow').appendTo($b);
		if (options.side) {
			if (/-/.test(options.side)) {
				side = options.side;
			} else if (options.side === "horizontal") {
				side = (targetRect.left<ww/2 ? "right" : "left") + "-" + (targetRect.top<wh/2 ? "bottom" : "top");
			} else if (options.side === "vertical") {
				side = (targetRect.top<wh/2 ? "bottom" : "top") + "-" + (targetRect.left<ww/2 ? "right" : "left");
			} else if ((match=options.side.match(/^(top|bottom)/))) {
				side = match[1] + "-" + (targetRect.left<ww/2 ? "right" : "left");
			} else {
				side = ( (options.side.match(/left|right/)||[])[0] || (targetRect.left<ww/2 ? "right" : "left") )
				+ "-"
				+ ( (options.side.match(/bottom|top/)||[])[0] || (targetRect.top<wh/2 ? "bottom" : "top") );
			}
		} else {
			side = (targetRect.top<wh/2 ? "bottom" : "top")
			+ "-"
			+ (targetRect.left<ww/2 ? "right" : "left");
		}
		switch (side) {
		case "bottom-left": // at the bottom right of the target, going towards left
			css = {
				right: ww-targetRect.right + Math.min(targetRect.width-25|0, 10),
				top: targetRect.bottom,
			};
			break;
		case "bottom-right": // at the bottom left of the target, going towards right
			css = {
				left: targetRect.left + Math.min(targetRect.width-26|0, -2),
				top: targetRect.bottom+1,
			};
			break;
		case "top-left": // at the bottom right, bubble extending towards left
			css = {
				right: ww-targetRect.right + Math.min(targetRect.width-25|0, 10),
				bottom: wh-targetRect.top,
			};
			break;
		case "top-right": // at the bottom left, bubble extending towards right
			css = {
				left: targetRect.left + Math.min(targetRect.width-26|0, -2),
				bottom: wh-targetRect.top,
			};
			break;
		case "left-bottom": // at the left of the target, going towards the bottom
			css = {
				right: ww-targetRect.left+5,
				top: targetRect.top-5
			};
			break;
		case "left-top":
			css = {
				bottom: wh-targetRect.bottom-12,
				right: ww-targetRect.left+5
			};
			break;
		case "right-bottom":
			css = {
				left: targetRect.right+7,
				top: targetRect.top-5,
				width: targetRect.w+400
			};
			break;
		case "right-top":
			css = {
				left: targetRect.right+7,
				bottom: wh-targetRect.bottom-12,
			};
			break;
		}
		$b.css(css).addClass(side+'-bubble');
		if (options.text) $c[0].innerText = options.text;
		else if (options.md) $c[0].innerHTML = fmt.mdTextToHtml(options.md);
		else if (options.html) $c[0].innerHTML = options.html;
		if (options.blower) {
			var r = options.blower.call(this, $c);
			if (r === false) $b.remove();
		}
		return this;
	}

	// registers options for bubbling:
	//   $(parentElement).bubbleOn("delegateSelector", options);
	//   $(bubblingElement).bubbleOn(options);
	// Options:
	//   side (optional): where the bubble should open
	//   blower: function called on the element with bubble content element as argument
	//		(may return false to prevent the bubble)
	$.fn.bubbleOn = function(selector, options){
		if (!options) {
			options = selector;
			selector = null;
		}
		if (typeof options === "string") options = {text: options};
		else if (typeof options === "function") options = {blower: options};
		var args = [options, function(e){
			$(this).bubble(options).one('mouseleave wheel', function(){
				$('.bubble').remove();
			});
		}];
		if (selector) args.unshift(selector);
		args.unshift("mouseenter");
		$.fn.on.apply(this, args);
		return this;
	}

	fish.closeBubbles = function(){
		$('.bubble').remove();
	}

	setTimeout(function(){
		if (gui.mobile) {
			$("#message-scroller").on("scroll", function(){
				$(".bubble").remove();
			});
		}
	}, 0);

	$("#messages").bubbleOn("[bubble]", function($c){
		$c.text(this.attr("bubble"));
	});
});

