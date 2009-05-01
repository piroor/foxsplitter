Sanitizer.prototype.items.splitBrowserUndoCache = {
	clear : function()
	{
		this._module.clearEntries(this.range);
		this._module.saveEntries();
	},
	get canClear()
	{
		return true;
	},
	range : null,

	get _module() 
	{
		if (!this.__module) {
			this.__module = {};
			Components.utils.import(
				'resource://splitbrowser-modules/undoCache.js',
				this.__module
			);
		}
		return this.__module.undoCache;
	},
	__module : null,
};
