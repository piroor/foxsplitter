/**
 * @fileOverview Keyboard shortcut helper module for restartless addons
 * @author       SHIMODA "Piro" Hiroshi
 * @version      1
 *
 * @license
 *   The MIT License, Copyright (c) 2011 SHIMODA "Piro" Hiroshi.
 *   https://github.com/piroor/restartless/blob/master/license.txt
 * @url http://github.com/piroor/restartless
 */

const EXPORTED_SYMBOLS = ['KeyboardShortcut'];

const XULAppInfo = Cc['@mozilla.org/xre/app-info;1']
					.getService(Ci.nsIXULAppInfo)
					.QueryInterface(Ci.nsIXULRuntime);

/**
 * aDefinition = {
 *   shortcut : String (key combinations, like "ctrl-shift-s"),
 *   (other properties) : String (attributes for the generated key element)
 * }
 */
function KeyboardShortcut(aDefinition, aKeySet) {
	this.init(aDefinition, aKeySet);
}
KeyboardShortcut.prototype = {
	init : function(aDefinition, aKeySet)
	{
		if (this._definition)
			return;

		if (!aKeySet)
			throw new Error('no <keyset/> element is specified!');

		aDefinition = this._normalizeDefinition(aDefinition);
		this._assertDefinition(aDefinition);
		this._definition = aDefinition;

		this._document = aKeySet.ownerDocument || aKeySet;
		this._window = this._document.defaultView;
		this._window.addEventListener('unload', this, false);
		this._createKeyIn(aKeySet);

		KeyboardShortcut.instances.push(this);
	},

	destroy : function()
	{
		if (!this._definition)
			return;

		this._window.removeEventListener('unload', this, false);

		if (this._keyset.parentNode)
			this._keyset.parentNode.removeChild(this._keyset);

		delete this._definition;
		delete this._document;
		delete this._window;
		delete this._keyset;
		delete this.node;

		KeyboardShortcut.instances = KeyboardShortcut.instances.filter(function(aKey) {
			return aKey != this;
		}, this);
	},

	handleEvent : function(aEvent)
	{
		this.destroy(); // on unload
	},

	_normalizeDefinition : function(aDefinition)
	{
		if (aDefinition.shortcut)
			aDefinition.shortcut = this._normalizeShortcut(aDefinition.shortcut);

		return aDefinition;
	},

	_assertDefinition : function(aDefinition)
	{
		if (!aDefinition || !aDefinition.shortcut)
			throw new Error('"shortcut", the keyboard shortcut is required!');
	},

	_normalizeShortcut : function(aShortcut)
	{
		return aShortcut
					.replace(/^\s+|\s+$/g, '')
					.replace(/\s+/g, ' ')
					.replace(/accel-/gi, XULAppInfo.OS == 'Darwin' ? 'meta' : 'ctrl' )
					.replace(/option-/gi, 'alt-')
					.replace(/control-/gi, 'ctrl-')
					.replace(/(command|\u2318)-/gi, 'meta-')
					.replace(/(?:(?:alt|ctrl|meta|shift)-)+/g, function(aModifiers) {
						return aModifiers.replace(/-$/, '').split('-').sort().join('-')+'-';
					})
					.toLowerCase();
	},

	_createKeyIn : function(aKeySet)
	{
		var shortcut = this._definition.shortcut;
		var key = this._document.createElement('key');

		var modifiers = [];
		if (shortcut.indexOf('alt-') > -1) modifiers.push('alt');
		if (shortcut.indexOf('ctrl-') > -1) modifiers.push('control');
		if (shortcut.indexOf('meta-') > -1) modifiers.push('meta');
		if (shortcut.indexOf('shift-') > -1) modifiers.push('shift');
		if (modifiers) key.setAttribute('modifiers', modifiers.join(','));

		var keyMatch = shortcut.match(/-(.)$/);
		var keyCodeMatch = shortcut.match(/-([^\-]+)$/);
		if (keyMatch = (keyMatch && keyMatch[1])) {
			key.setAttribute('key', keyMatch);
		}
		else if (keyCodeMatch = (keyCodeMatch && KeyboardShortcut._keyCodeFromKeyName(keyCodeMatch[1]))) {
			key.setAttribute('keycode', keyCodeMatch);
		}
		else {
			this.destroy();
			throw new Error(shortcut+' is not a valid shortcut!');
		}

		for (let attr in this._definition)
		{
			if (attr == 'shortcut' || !this._definition.hasOwnProperty(attr))
				continue;
			key.setAttribute(attr, this._definition[attr]);
		}

		/**
		 * <key/> must be inserted with new <keyset/>, because <key/>s
		 * inserted into existing <keyset/> doesn't work due to Gecko's bug.
		 * http://d.hatena.ne.jp/onozaty/20080204/p1
		 * https://bugzilla.mozilla.org/show_bug.cgi?id=399604
		 * https://bugzilla.mozilla.org/show_bug.cgi?id=101116
		 */
		this._keyset = this._document.createElement('keyset');
		this._keyset.appendChild(key);

		aKeySet.appendChild(this._keyset);
		this.node = key;
	}
};

KeyboardShortcut.instances = [];

KeyboardShortcut.toKeyboardShortcut = function(aEvent) {
	if (aEvent.keyCode == Ci.nsIDOMKeyEvent.DOM_VK_ALT ||
		aEvent.keyCode == Ci.nsIDOMKeyEvent.DOM_VK_CONTROL ||
		aEvent.keyCode == Ci.nsIDOMKeyEvent.DOM_VK_META ||
		aEvent.keyCode == Ci.nsIDOMKeyEvent.DOM_VK_SHIFT)
		return '';

	var shortcut = [];
	if (aEvent.altKey) shortcut.push('Alt');
	if (aEvent.ctrlKey) shortcut.push(XULAppInfo.OS == 'Darwin' ? 'Control' : 'Ctrl');
	if (aEvent.metaKey) shortcut.push(XULAppInfo.OS == 'Darwin' ? /* 'Command' */ '\u2318' : 'Meta' );
	if (aEvent.shiftKey) shortcut.push('Shift');
	if (aEvent.charCode) shortcut.push(String.fromCharCode(aEvent.charCode));
	if (aEvent.keyCode) shortcut.push(this._keyNameFromKeyCode(aEvent.keyCode));
	return shortcut.join('-');
};
KeyboardShortcut.create = function(aDefinition, aKeySet) {
	return new this(aDefinition, aKeySet);
};

KeyboardShortcut._keyNameFromKeyCode = function(aCode) {
	for (let prop in Ci.nsIDOMKeyEvent)
	{
		if (Ci.nsIDOMKeyEvent[prop] == aCode)
			return prop.replace(/^DOM_VK_/, '')
					.split('_')
					.map(function(aPart) {
						return aPart.charAt(0).toUpperCase()+aPart.toLowerCase().substring(1);
					})
					.join('');
	}
	return 'unknown';
};
KeyboardShortcut._keyCodeFromKeyName = function(aName) {
	var keyCode = 'VK_'+
					aName
					.replace(/[A-Z][a-z]+/g, function(aPart) {
						return '-'+aPart;
					})
					.replace(/^-/, '')
					.toUpperCase();
	return ('DOM_'+keyCode in Ci.nsIDOMKeyEvent) ? keyCode : '' ;
};

/** A handler for bootstrap.js */
function shutdown()
{
	KeyboardShortcut.instances.slice(0).forEach(function(aKey) {
		aKey.destroy();
	});
	KeyboardShortcut = undefined;
}
