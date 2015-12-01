(function(global) {
	var DEBUG = false;
	function mydump(aMessage) {
		if (DEBUG)
			dump('foxsplitter content utils: '+aMessage +'\n');
	}
	mydump('CONTENT SCRIPT LOADED');

	var { FoxSplitterConst } = Components.utils.import('resource://foxsplitter-resources/modules/const.js', {});
	var { setTimeout, clearTimeout } = Components.utils.import('resource://gre/modules/Timer.jsm', {});

	var Cc = Components.classes;
	var Ci = Components.interfaces;
	var Cu = Components.utils;
	var Cr = Components.results;

	function free() {
		cleanup =
			Cc = Ci = Cu = Cr =

			FoxSplitterConst =

			collectAllFrames =

			scrollEventListening =
			scrollFactorApplying =
			scrollThrottlingTimers =
			handleEvent =

			setTimeout =
				clearTimeout =
			mydump =
				undefined;
	}

	function collectAllFrames(aFrame) {
		var frames = [aFrame];
		frames.push(aFrame);
		Array.forEach(aFrame.frames, function(aFrame) {
			frames = frames.concat(collectAllFrames(aFrame));
		}, this);
		return frames;
	}

	var messageListener = function(aMessage) {
		mydump('CONTENT MESSAGE LISTENED');
		mydump(JSON.stringify(aMessage.json));
		switch (aMessage.json.command)
		{
			case FoxSplitterConst.COMMAND_SHUTDOWN:
				global.removeMessageListener(FoxSplitterConst.MESSAGE_TYPE, messageListener);
				if (scrollEventListening)
					global.removeEventListener('scroll', handleEvent, true);
				free();
				return;

			case FoxSplitterConst.COMMAND_REQUEST_UPDATE_SYNC_STATE:
				if (aMessage.json.params.sync == scrollEventListening)
					return;
				if (aMessage.json.params.sync) {
					scrollEventListening = true;
					global.addEventListener('scroll', handleEvent, true);
				}
				else {
					scrollEventListening = false;
					global.removeEventListener('scroll', handleEvent, true);
				}
				return;

			case FoxSplitterConst.COMMAND_REQUEST_APPLY_SCROLL_FACTOR:
				scrollFactorApplying = true;
				{
					let params = aMessage.json.params;
					let frames = collectAllFrames(content);
					if (!params.frameIndex || params.frameIndex >= frames.length)
						params.frameIndex = 0;

					let frame = frames[params.frameIndex];
					frame.scrollTo(
						('x' in params ? (params.x * frame.scrollMaxX) : frame.scrollX ),
						('y' in params ? (params.y * frame.scrollMaxY) : frame.scrollY )
					);
				}
				setTimeout(function() {
					scrollFactorApplying = false;
				}, 0);
				return;
		}
	};
	global.addMessageListener(FoxSplitterConst.MESSAGE_TYPE, messageListener);

	var scrollFactorApplying = false;
	var scrollEventListening = false;
	var scrollThrottlingTimers = new WeakMap();
	function handleEvent(aEvent) {
		switch (aEvent.type)
		{
			case 'scroll':
				if (scrollFactorApplying)
					return;
				{
					let scrolledFrame = aEvent.originalTarget.defaultView;
					if (!scrolledFrame)
						return;

					let timer = scrollThrottlingTimers.get(scrolledFrame);
					if (timer) {
						clearTimeout(timer);
						scrollThrottlingTimers.delete(scrolledFrame);
					}
					timer = setTimeout(function() {
						if (!scrollThrottlingTimers)
							return;
						scrollThrottlingTimers.delete(scrolledFrame);
						try {
							var xFactor = scrolledFrame.scrollX / scrolledFrame.scrollMaxX;
							var yFactor = scrolledFrame.scrollY / scrolledFrame.scrollMaxY;
							var frames = collectAllFrames(scrolledFrame.top);
							var index = frames.indexOf(scrolledFrame);
							global.sendAsyncMessage(FoxSplitterConst.MESSAGE_TYPE, {
								command : FoxSplitterConst.COMMAND_REPORT_PAGE_SCROLLED,
								params  : {
									x          : xFactor,
									y          : yFactor,
									frameIndex : index
								}
							});
						}
						catch(e) {
							// dump(e, 'FoxSplitter: FAILED TO SYNC SCROLL!');
						}
					}, 50);
				}
				break;
		}
	}

	global.sendAsyncMessage(FoxSplitterConst.MESSAGE_TYPE, {
		command : FoxSplitterConst.COMMAND_REPORT_INITIALIZED
	});
})(this);
