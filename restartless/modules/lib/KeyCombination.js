/**
 * @fileOverview Key combination management module for restartless addons
 * @author       SHIMODA "Piro" Hiroshi
 * @version      1
 *
 * @license
 *   The MIT License, Copyright (c) 2011 SHIMODA "Piro" Hiroshi.
 *   https://github.com/piroor/restartless/blob/master/license.txt
 * @url http://github.com/piroor/restartless
 */

const EXPORTED_SYMBOLS = ['KeyCombination'];

const XULAppInfo = Cc['@mozilla.org/xre/app-info;1']
					.getService(Ci.nsIXULAppInfo)
					.QueryInterface(Ci.nsIXULRuntime);

var KeyCombination = {
	BUFFER   : 'restartless@piro.sakura.ne.jp_KeyCombination_bufferedKeyStrokes',
	COMMANDS : 'restartless@piro.sakura.ne.jp_KeyCombination_commands',
	EVENT_TYPE_COMMAND : 'nsDOMKeyCombinationCommand:restartless@piro.sakura.ne.jp:',

	_windows : [],
	_managedCommands : [],

	normalizeCombination : function(aCombination)
	{
		return aCombination
					.replace(/^\s+|\s+$/g, '')
					.replace(/\s+/g, ' ')
					.replace(/accel-/gi, XULAppInfo.OS == 'Darwin' ? 'meta' : 'ctrl' )
					.replace(/control-/gi, 'ctrl-')
					.replace(/command-/gi, 'meta-')
					.replace(/(?:(?:alt|ctrl|meta|shift)-)+/g, function(aModifiers) {
						return aModifiers.replace(/-$/, '').split('-').sort().join('-')+'-';
					})
					.toLowerCase();
	},

	registerCommand : function(aDOMWindow, aCommand, aKeyCombination)
	{
		if (!aDOMWindow || !aCommand)
			return;

		aKeyCombination = this.normalizeCombination(aKeyCombination);
		if (!aKeyCombination)
			return;

		if (this._windows.indexOf(aDOMWindow) < 0) {
			this._windows.push(aDOMWindow);
			aDOMWindow.addEventListener('keypress', this, true);
			aDOMWindow.addEventListener('unload', this, false);
		}
		if (this._managedCommands.indexOf(aCommand) < 0)
			this._managedCommands.push(aCommand);

		var commands = aDOMWindow[this.COMMANDS] || '';
		commands = commands
					.replace(new RegExp('^'+aKeyCombination+'\\t', 'm'), '')
					.replace(/\n\n+/g, '\n');
		commands = (commands ? commands+'\n' : '')+
					aKeyCombination + '\t' + encodeURIComponent(aCommand);

		aDOMWindow[this.COMMANDS] = commands;
	},

	unregisterCommand : function(aDOMWindow, aCommand, aOnlyWindow)
	{
		if (!aDOMWindow || !aCommand)
			return;

		if (!aOnlyWindow) {
			let index = this._managedCommands.indexOf(aCommand)
			if (index > -1)
				this._managedCommands.splice(index, 1);
		}

		var commands = aDOMWindow[this.COMMANDS] || '';
		commands = commands
					.replace(new RegExp('^.+\\t'+encodeURIComponent(aCommand)+'$', 'm'), '')
					.replace(/\n\n+/g, '\n');

		aDOMWindow[this.COMMANDS] = commands;
	},

	unregisterWindow : function(aDOMWindow)
	{
		this._managedCommands.forEach(function(aCommand) {
			this.unregisterCommand(aDOMWindow, aCommand, true);
		}, this);
		aDOMWindow.removeEventListener('keypress', this, true);
		aDOMWindow.removeEventListener('unload', this, false);
	},

	handleEvent : function(aEvent)
	{
		switch (aEvent.type)
		{
			case 'keypress':
				return this._onKeyPress(aEvent);
			case 'unload':
				return this._onUnload(aEvent);
		}
	},

	_onKeyPress : function(aEvent)
	{
		var window = aEvent.currentTarget;

		var stroke = [];
		if (aEvent.altKey) stroke.push('alt');
		if (aEvent.ctrlKey) stroke.push('ctrl');
		if (aEvent.metaKey) stroke.push('meta');
		if (aEvent.shiftKey) stroke.push('shift');
		if (aEvent.charCode) stroke.push(String.fromCharCode(aEvent.charCode));
		if (aEvent.keyCode) stroke.push(this._keyNameFromKeyCode(aEvent.keyCode));
		stroke = stroke.join('-').toLowerCase();

		var shortcuts = window[this.COMMANDS] || '';
		if (!window[this.BUFFER]) {
			if (!(new RegExp('^'+stroke+'\\s', 'm')).test(shortcuts))
				return;
			window[this.BUFFER] = stroke;
		}
		else {
			window[this.BUFFER] += ' ' + stroke;
			if (!(new RegExp('^'+window[this.BUFFER]+'\\s', 'm')).test(shortcuts)) {
				window[this.BUFFER] = '';
				return;
			}
		}

		var matchedCommand = shortcuts.match(new RegExp('^'+window[this.BUFFER]+'\t(.+)$', 'm'));
		if (matchedCommand) {
			window[this.BUFFER] = '';
			this._fireKeyboardCommandEvent(decodeURIComponent(matchedCommand[1]), window.document);
		}
		aEvent.stopPropagation();
		aEvent.preventDefault();
	},

	_keyNameFromKeyCode : function(aCode)
	{
		for (let prop in Ci.nsIDOMKeyEvent)
		{
			if (Ci.nsIDOMKeyEvent[prop] == aCode)
				return prop.replace(/^DOM_VK_/, '').replace(/_/g, '');
		}
		return 'unknown';
	},

	_fireKeyboardCommandEvent : function(aCommand, aDocument)
	{
		var event = aDocument.createEvent('Events');
		event.initEvent(this.EVENT_TYPE_COMMAND+aCommand, true, false);
		aDocument.dispatchEvent(event);
	},

	_onUnload : function(aEvent)
	{
		var window = aEvent.target;
		window = (window.ownerDocument || window).defaultView || window;
		this.unregisterWindow(window);
	}
};

/** A handler for bootstrap.js */
function shutdown()
{
	KeyCombination._windows.forEach(function(aWindow) {
		KeyCombination.unregisterWindow(aWindow);
	});
	KeyCombination._managedCommands = [];
	KeyCombination = undefined;
}
