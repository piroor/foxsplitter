var global = this;
function shutdown()
{
	global.window = void(0);
	global.prefs = void(0);
	global = void(0);
	namespace = void(0);
}
var namespace = {
	};

/**
 * @fileOverview Popup Notification (Door Hanger) Based Confirmation Library for Firefox 31 or later
 * @author       YUKI "Piro" Hiroshi
 * @version      8
 * Basic usage:
 *
 * @example
 *   Usage:
 *     Components.utils.import('resource://my-modules/confirmWithPopup.js');
 *
 *     confirmWithPopup({
 *       browser : gBrowser.selectedBrowser,            // the related browser
 *       label   : 'Ara you ready?',                    // the message
 *       value   : 'treestyletab-undo-close-tree',      // the internal key (optional)
 *       anchor  : '....',                              // the ID of the anchor element (optional)
 *       image   : 'chrome://....png',                  // the icon (optional)
 *       buttons : ['Yes', 'Yes forever', 'No forever], // button labels
 *       // Native options for PopupNotifications.show() :
 *       //   persistence (integer)
 *       //   timeout (integer)
 *       //   persistWhileVisible (boolean)
 *       //   dismissed (boolean)
 *       //   eventCallback (function)
 *       //   neverShow (boolean)
 *       //   popupIconURL (string) : will be used instead of "image" option.
 *     });
 *
 *  ES6 Promise style:
 *    confirmWithPopup(...)
 *     .then(function(aButtonIndex) {
 *       // the next callback receives the index of the clicked button.
 *       switch (aButtonIndex) {
 *         case 0: return YesAction();
 *         case 1: return YesForeverAction();
 *         case 2: return NoForeverAction();
 *       }
 *     })
 *     .catch(function(aError) {
 *       // dismissed or removed (not called if any button is chosen)
 *       ...
 *     });
 *
 *  without Promise:
 *    confirmWithPopup({ ...,
 *      // Yes, Yes Forever, or No Forever
 *      callback : function(aButtonIndex) { ... },
 *      // dismissed or removed (not called if any button is chosen)
 *      onerror  : function(aError) { ... }
 *    });
 *
 * @license
 *   The MIT License, Copyright (c) 2011-2014 YUKI "Piro" Hiroshi
 * @url http://github.com/piroor/fxaddonlib-confirm-popup
 */

if (typeof window == 'undefined')
	this.EXPORTED_SYMBOLS = ['confirmWithPopup'];

// var namespace;
if (typeof namespace == 'undefined') {
	// If namespace.jsm is available, export symbols to the shared namespace.
	// See: http://github.com/piroor/fxaddonlibs/blob/master/namespace.jsm
	try {
		let ns = {};
		Components.utils.import('resource://my-modules/namespace.jsm', ns);
		namespace = ns.getNamespaceFor('piro.sakura.ne.jp');
	}
	catch(e) {
		namespace = (typeof window != 'undefined' ? window : null ) || {};
	}
}

var available = false;
try {
	Components.utils.import('resource://gre/modules/PopupNotifications.jsm');
	available = true;
}
catch(e) {
}

var confirmWithPopup;
(function(global) {
	const currentRevision = 8;

	var loadedRevision = 'confirmWithPopup' in namespace ?
			namespace.confirmWithPopup.revision :
			0 ;
	if (loadedRevision && loadedRevision > currentRevision) {
		confirmWithPopup = namespace.confirmWithPopup;
		return;
	}

	if (!available)
		return global.confirmWithPopup = undefined;

	const Cc = Components.classes;
	const Ci = Components.interfaces;

	const DEFAULT_ANCHOR_ICON = 'default-notification-icon';
	const NATIVE_OPTIONS = 'persistence,timeout,persistWhileVisible,dismissed,eventCallback,neverShow,popupIconURL'.split(',');
	const OPTIONS = 'browser,tab,label,value,anchor,image,imageWidth,imageHeight,button,buttons,callback,onerror'.split(',');

	var { Promise } = Components.utils.import('resource://gre/modules/Promise.jsm', {});

	function setTimeout(aCallback, aDelay) {
		Cc['@mozilla.org/timer;1']
			.createInstance(Ci.nsITimer)
			.init(aCallback, aDelay, Ci.nsITimer.TYPE_ONE_SHOT);
	}

	// We have to use a custom stylesheet to show the anchor element.
	function addStyleSheet(aDocument, aOptions) {
		var uri = 'data:text/css,'+encodeURIComponent(
				(aOptions.image ?
					'.popup-notification-icon[popupid="'+aOptions.id+'"] {'+
					'	list-style-image: url("'+aOptions.image+'");'+
					(aOptions.imageWidth ? 'width: '+aOptions.imageWidth+'px;' : '' )+
					(aOptions.imageHeight ? 'height: '+aOptions.imageHeight+'px;' : '' )+
					'}' :
					''
				)+
				'#notification-popup-box[anchorid="'+aOptions.anchor+'"] > #'+aOptions.anchor+' {'+
				'	display: -moz-box;'+
				'}' +
				(aOptions.label.indexOf('\n') > -1 ?
					'popupnotification[id="'+aOptions.id+'-notification"] .popup-notification-description {' +
					'	white-space: pre-wrap;' +
					'}' :
					''
				)
			);

		var styleSheets = aDocument.styleSheets;
		for (var i = 0, maxi = styleSheets.length; i < maxi; i++) {
			if (styleSheets[i].href == uri)
				return styleSheets[i].ownerNode;
		}

		var style = aDocument.createProcessingInstruction('xml-stylesheet',
				'type="text/css" href="'+uri+'"'
			);
		aDocument.insertBefore(style, aDocument.documentElement);
		return style;
	}

	function normalizeOptions(aOptions) {
		var options = collectNativeOptions(aOptions);
		OPTIONS.forEach(function(aOption) {
			options[aOption] = aOptions[aOption] ;
		});

		options.image = options.popupIconURL || options.image ;

		// we should accept single button type popup
		if (!options.buttons && options.button)
			options.buttons = [options.button];

		if (!options.browser && options.tab)
			options.browser = options.tab.linkedBrowser;

		if (!options.anchor)
			options.anchor = DEFAULT_ANCHOR_ICON;

		return options;
	}

	function collectNativeOptions(aOptions) {
		var options = {};
		NATIVE_OPTIONS.forEach(function(aOption) {
			options[aOption] = aOptions.option && aOptions.option[aOption] || aOptions[aOption] ;
		});
		return options;
	}

	confirmWithPopup = function confirmWithPopup(aOptions) 
	{
		var options = normalizeOptions(aOptions);
		var nativeOptions = collectNativeOptions(options);

		if (!options.buttons)
			return Promise.reject(new Error('confirmWithPopup requires any button!'));

		var b = options.browser;
		if (!b && options.window)
			b = options.window.gBrowser;

		if (!b)
			return Promise.reject(new Error('confirmWithPopup requires a <xul:browser/>!'));

		if (b.localName == 'tabbrowser')
			b = b.selectedBrowser;

		var doc = b.ownerDocument;
		var style;
		var done = false;
		var postProcess = function() {
				if (doc && style && style.parentNode) {
					doc.removeChild(style);
					style = null;
				}
			};

		return new Promise((function(aResolve, aReject) {

		var showPopup = function() {
			var accessKeys = [];
			var numericAccessKey = 0;
			var buttons = options.buttons.map(function(aLabel, aIndex) {
					// see resource://gre/modules/CommonDialog.jsm
					var accessKey;
					var match;
					if (match = aLabel.match(/^\s*(.*?)\s*\(\&([^&])\)(:)?$/)) {
						aLabel = (match[1] + (match[3] || '')).replace(/\&\&/g, '&');
						accessKey = match[2];
					}
					else if (match = aLabel.match(/^\s*(.*[^&])?\&(([^&]).*$)/)) {
						aLabel = ((match[1] || '') + match[2]).replace(/\&\&/g, '&');
						accessKey = match[3];
					}
					else {
						let lastUniqueKey;
						let sanitizedLabel = [];
						for (let i = 0, maxi = aLabel.length; i < maxi; i++)
						{
							let possibleAccessKey = aLabel.charAt(i);
							if (!lastUniqueKey &&
								accessKeys.indexOf(possibleAccessKey) < 0) {
								lastUniqueKey = possibleAccessKey;
							}
							sanitizedLabel.push(possibleAccessKey);
						}
						if (!accessKey)
							accessKey = lastUniqueKey;
						if (!accessKey || !/[0-9a-z]/i.test(accessKey))
							accessKey = ++numericAccessKey;

						aLabel = sanitizedLabel.join('').replace(/\&\&/g, '&');
					}

					accessKeys.push(accessKey);

					return {
						label     : aLabel,
						accessKey : accessKey,
						callback  : function() {
							done = true;
							try {
								aResolve(aIndex);
							}
							finally {
								postProcess();
							}
						}
					};
				});

			var primaryAction = buttons[0];
			var secondaryActions = buttons.length > 1 ? buttons.slice(1) : null ;

			options.id = options.value || 'confirmWithPopup-'+encodeURIComponent(options.label);
			options.label = options.label.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

			style = addStyleSheet(doc, options);

			try {
				doc.defaultView.PopupNotifications.show(
					b,
					options.id,
					options.label,
					options.anchor,
					primaryAction,
					secondaryActions,
					Object.create(nativeOptions, {
						eventCallback : {
							writable     : true,
							configurable : true,
							enumerable   : true,
							value        : function(aEventType) {
								try {
									if (!done && (aEventType == 'removed' || aEventType == 'dismissed'))
										aReject(aEventType);
									if (options.eventCallback)
										options.eventCallback.call(aOptions.options || aOptions, aEventType);
								}
								finally {
									if (aEventType == 'removed')
										postProcess();
								}
							}
						}
					})
				);
			}
			catch(e) {
				aReject(e);
			}
		};

		if (options.image && (!options.imageWidth || !options.imageHeight)) {
			let loader = new doc.defaultView.Image();
			loader.src = options.image;
			loader.onload = function() {
				options.imageWidth = loader.width;
				options.imageHeight = loader.height;
				showPopup();
			};
			loader.onerror = function() {
				showPopup();
			};
		}
		else {
			setTimeout(showPopup, 0);
		}

		}).bind(this));
	};
	confirmWithPopup.version = currentRevision;

	global.confirmWithPopup = namespace.confirmWithPopup = confirmWithPopup;
})(this);

if (typeof exports == 'object')
	exports.confirmWithPopup = confirmWithPopup;
