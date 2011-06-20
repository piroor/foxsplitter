/**
 * @fileOverview Toolbar item module for restartless addons
 * @author       SHIMODA "Piro" Hiroshi
 * @version      1
 *
 * @license
 *   The MIT License, Copyright (c) 2011 SHIMODA "Piro" Hiroshi.
 *   https://github.com/piroor/restartless/blob/master/license.txt
 * @url http://github.com/piroor/restartless
 */

const EXPORTED_SYMBOLS = ['ToolbarItem'];

/**
 * aDefinition = {
 *   node      : nsIDOMElement (the toolbar item),
 *   toolbar   : String (the ID of customizable toolbar),
 *   onInit    : Function (optional: called when the item is inserted to the toolbar),
 *   onDestroy : Function (optional: called when the item is removed from the toolbar)
 * }
 */
function ToolbarItem(aDefinition) {
	this.init(aDefinition);
}
ToolbarItem.prototype = {
	get inserted()
	{
		const nsIDOMNode = Ci.nsIDOM3Node || Ci.nsIDOMNode; // on Firefox 7, nsIDOM3Node was merged to nsIDOMNode.
		return this.document.compareDocumentPosition(this.node) & nsIDOMNode.DOCUMENT_POSITION_CONTAINED_BY;
	},

	init : function(aDefinition)
	{
		if (this.definition)
			return;

		this.normalizeDefinition(aDefinition);
		this.assertDefinition(aDefinition);
		this.definition = aDefinition;

		this.node = this.definition.node;
		this.document = this.node.ownerDocument || this.node;
		this.window = this.document.defaultView;

		this.window.addEventListener('beforecustomization', this, false);
		this.window.addEventListener('aftercustomization', this, false);
		this.window.addEventListener('unload', this, false);

		ToolbarItem.instances.push(this);

		this.initialInsert();

		this.onAfterCustomization();
	},

	destroy : function()
	{
		if (!this.definition)
			return;

		this.onBeforeCustomization();

		this.window.removeEventListener('beforecustomization', this, false);
		this.window.removeEventListener('aftercustomization', this, false);
		this.window.removeEventListener('unload', this, false);

		if (this.node.parentNode)
			this.node.parentNode.removeChild(this.node);

		delete this.definition;
		delete this.node;
		delete this.document;
		delete this.window;

		ToolbarItem.instances = ToolbarItem.instances.filter(function(aItem) {
			return aItem != this;
		}, this);
	},

	normalizeDefinition : function(aDefinition)
	{
		if (aDefinition.element && !aDefinition.node)
			aDefinition.node = aDefinition.element;

		aDefinition.node.setAttribute('removable', true);

		if (aDefinition.oninit && !aDefinition.onInit)
			aDefinition.onInit = aDefinition.oninit;
		if (aDefinition.init && !aDefinition.onInit)
			aDefinition.onInit = aDefinition.init;

		if (aDefinition.ondestroy && !aDefinition.onDestroy)
			aDefinition.onDestroy = aDefinition.ondestroy;
		if (aDefinition.destroy && !aDefinition.onInit)
			aDefinition.onDestroy = aDefinition.destroy;

		if (aDefinition.toolbar && aDefinition.toolbar instanceof Ci.nsIDOMElement)
			aDefinition.toolbar = aDefinition.toolbar.id;
	},

	assertDefinition : function(aDefinition)
	{
		if (!aDefinition.node)
			throw new Error('"node", the toolbar item DOM element is required!');
		if (!aDefinition.node.id)
			throw new Error('"node", the toolbar item DOM element must have ID!');
		if (!aDefinition.toolbar)
			throw new Error('"toolbar", the ID of the default toolbar is required!');
	},


	initialInsert : function()
	{
		var toolbar = this.getNodeByXPath('/descendant::*[local-name()="toolbar" and contains(concat(",",@currentset,","), '+this.node.id.quote()+')]');
		if (toolbar) { // when inserted into another toolbar
			if (!this.inserted) {
				let items = toolbar.currentSet.split(',');
				let index = items.indexOf(this.node.id) + 1;
				if (index < items.length)
					toolbar.insertBefore(this.node, this.document.getElementById(items[index]));
			}
			return;
		}

		toolbar = this.document.getElementById(this.definition.toolbar);
		if (!toolbar || !toolbar.toolbox )
			return;

		const Prefs = Cc['@mozilla.org/preferences;1']
						.getService(Ci.nsIPrefBranch);
		const key = 'extensions.restartless@piro.sakura.ne.jp.toolbaritem.'+this.node.id+'.initialized';

		var done = false;
		try {
			done = Prefs.getBoolPref(key);
		}
		catch(e) {
		}

		if (done) {
			let palette = toolbar.toolbox.palette || this.getNodeByXPath('descendant::*[local-name()="toolbarpalette"]', toolbar.toolbox);
			if (palette)
				palette.appendChild(this.node);
			return;
		}

		var refNode = this.getNodeByXPath('descendant::*[@id="fullscreenflex"]') ||
					this.getNodeByXPath('descendant::*[@id="window-controls"]');
		toolbar.insertBefore(this.node, refNode);

		var currentset = toolbar.currentSet.replace(/__empty/, '');
		currentset = currentset ? currentset.split(',') : [] ;
		currentset.push(this.node.id);
		currentset = currentset.join(',');
		toolbar.currentSet = currentset;
		toolbar.setAttribute('currentset', currentset);
		this.document.persist(toolbar.id, 'currentset');

		Prefs.setBoolPref(key, true);
	},

	getNodeByXPath : function(aExpression, aContext)
	{
		return this.document.evaluate(
			aExpression,
			aContext || this.document,
			null,
			Ci.nsIDOMXPathResult.FIRST_ORDERED_NODE_TYPE,
			null
		).singleNodeValue;
	},


	handleEvent : function(aEvent)
	{
		switch (aEvent.type)
		{
			case 'beforecustomization':
				return this.onBeforeCustomization();

			case 'aftercustomization':
				return this.onAfterCustomization();

			case 'unload':
				return this.destroy();
		}
	},

	onBeforeCustomization : function()
	{
		if (this.definition && this.definition.destroy && this.inserted)
			this.definition.destroy();
	},

	onAfterCustomization : function()
	{
		if (this.definition && this.definition.destroy && this.inserted)
			this.definition.init();
	},


	addEventListener : function(aType, aListener, aUseCapture, aAcceptUnsafeEvents)
	{
		return this.node.addEventListener(aType, aListener, aUseCapture, aAcceptUnsafeEvents);
	},

	removeEventListener : function(aType, aListener, aUseCapture, aAcceptUnsafeEvents)
	{
		return this.node.removeEventListener(aType, aListener, aUseCapture, aAcceptUnsafeEvents);
	}
};

ToolbarItem.instances = [];

/** A handler for bootstrap.js */
function shutdown()
{
	ToolbarItem.instances.slice(0).forEach(function(aItem) {
		aItem.destroy();
	});
	ToolbarItem = undefined;
}
