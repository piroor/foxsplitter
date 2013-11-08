# History

 - master/HEAD
 - 2.1.2012122901
   * Works on Nightly 20.0a1.
   * Drop support for Firefox 9 and older versions.
 - 2.1.2012042301
   * Improved: Better handling about resizing and moving of grouped windows. Now, switching workspaces on Linux don't break sizes and positions of grouped windows.
   * Improved: Add a new feature "stretch the window to the size of the group". In other words, you can hide other member windows to concentrate your eyes on a window.
   * Improved: Keep the size of the group smaller than the screen if possible. If you are trying to open a new member window and it will be out of the screen, then the whole group will be moved and resized to show the newly opened member in the current screen.
   * Fixed: Restore nested groups correctly.
   * Fixed: Disable "auto hide" feature of the toolbox temporarily, while in the toolbar customization.
   * Fixed: Free memory completely when this is disabled or uninstalled.
   * Fixed: Fix configuration dialog about platform specific workarounds.
   * Fixed: Don't hide the sidebar in grouped windows if [Ez Sidebar](http://piro.sakura.ne.jp/xul//xul/_ezsidebar.html.en) is installed.
   * Modified: Drop support for the secret preference "shouldFixActiveWindow". Now, focused window isn't shown with complete UI until you set the window as "main" manually.
 - 2.0.2012040401
   * Works on Firefox 3.6 again (for incremental migration of Firefox and Fox Splitter)
 - 2.0.2012040202
   * Fixed: Failed to detect location of wmctrl.
 - 2.0.2012040201
   * Drop support for Firefox versions from 3.6 to 9.0. Now Fox Splitter works on Firefox 10 and later.
   * Improved: The toolbox in split windows can be hidden/shown automatically.
   * Improved: On Linux, control overlapping order of windows more silently by [wmctrl](http://tomas.styblo.name/wmctrl/).
   * Improved: Add a new option to disable automatic-resizing of other windows (to keep window size ratio).
   * Fixed: Correct UIs for some options. They didn't work correctly: "When the 'Split' button in the toolbar is clicked" and "When the 'Split window' in the Firefox menu is clicked".
   * Fixed: Save and restore the state of grouped windows correctly.
 - 2.0.2012012901
   * Works on Nightly 12.0a1.
   * Improved: Window frames for grouped windows are now shrunken for Aero Glass (Windows Vista and later).
   * Improved: Now we can disable "auto rising" of grouped windows. To do it, set the secret preference "extensions.foxsplitter@piro.sakura.ne.jp.methodToRaiseWindow" to "-1".
   * Improved: Now the only one "main" window in a group has full UI and others have minimal UI, even if window focus is changed. You can change the "main" window from the menu of the toolbar button.
   * Improved: "Split" button works more intelligently (split to right, split to bottom, split to right, ...)
   * Improved: Scrolled positions of windows which are split from one tab are controled like a two panes in a window.
   * Fixed: Used-defined keyboard shortcuts didn't work.
   * Fixed: Works with single maximized window correctly.
   * Fixed: While you dragging something onto any popup, Fox Splitter now doesn't show the drop position marker.
   * Fixed: Scrolling by mouse wheel was too slow if the window was activated for "sync scroll".
 - 2.0.2011090101
   * Fixed: Extra toolbars didn't hidden actually even if it is unchecked in the section "visible UI in split windows" of the configuration dialog. Now, they are hidden correctly.
   * Fixed: After a split window is merged to another window, an extra blank tab was opened unexpectedly.
 - 2.0.2011082901
   * Fixed: When this is updated, unexpectedly activated even if this is disabled by user.
   * Fixed: Dragover on textboxes is now ignored.
   * Fixed: Extra context menu items were not updated correctly.
 - 2.0.2011062701
   * Fixed: Panorama was unexpectedly shown after a tab which belonged to a group was split from existing window.
 - 2.0.2011062602
   * License of source codes was not specified.
 - 2.0.2011062601
   * Restructured based on Firefox's window, not a custom binding.
 - 0.6.2009110501
   * Works on Minefield and Firefox 3.6.
   * Fixed: More safer code.
   * it-IT locale is updated by Godai71.
 - 0.6.2009050101
   * Works on Shiretoko 3.5b5pre and Minefield.
   * Supporting of Firefox 2 is dropped.
   * Modified: Drag and drop to toolbar in split panes works like as to tab bar.
   * Improved: For drag and drop of links, tabs and so on, the "Split" button keeps itself showing while you move the pointer.
   * Improved: Tabs in split panes are shown in the tab previews of Minefield.
   * Improved: Split panes are saved for each window.
   * Improved: Now "Undo Close Pane" and "Recently Closed Panes" are available. You can reopen closed panes.
   * Improved: Supports the private browsing mode of Shiretoko 3.5b5pre.
 - 0.5.2008112201
   * Fixed: Works on Minefield 3.1b2pre again.
   * Spanish locale is updated. (by tito)
 - 0.5.2008101801
   * Improved: Works on Minefield 3.1b2pre.
   * Improved: On Minefield 3.1b2pre, split browsers and tabs can be moved without reloading, by drag and drop.
   * Improved: Tabs and split browsers are more integrated. They can be moved by simple dragging, and they are cloned by dragging with Ctrl (or Command) key.
   * Improved: Works with [ReloadEvery 3.0.0](https://addons.mozilla.org/firefox/addon/115). You can reload split browser automatically.
   * Improved: Works with [Tree Style Tab](http://piro.sakura.ne.jp/xul/../_treestyletab.html.en) and [Multiple Tab Handler](http://piro.sakura.ne.jp/xul/../_multipletab.html.en) more integratedly.
   * Fixed: Find in pages works on Firefox 3.
   * zh-CN locale is available. (by Vincent D)
   * Firefox 1.5 is dropped.
 - 0.4.2008061601
   * Updated: ko-KR locale is updated.
 - 0.4.2008050601
   * Fixed: Keyboard shortcuts for "Bookmark This Page" works correctly on Firefox 3.
   * Updated: Traditional Chinese locale is updated.
 - 0.4.2008042801
   * Fixed: Search results are loaded in split browsers correctly on Trunk.
   * Fixed: Works with Second Search correctly.
   * Fixed: "Close Other Tabs" of All-in-One Gestures works correctly.
 - 0.4.2008030901
   * Improved: Synchronized scroll can work only for vertical scroll.
   * Fixed: Works with Google Docs.
   * Works on Minefield 3.0b5pre.
 - 0.4.2007120601
   * Improved: Search result from the search bar can be loaded into split panes.
   * Updated: Korean locale is updated. (by 박찬규)
 - 0.4.2007120101
   * Fixed: Now "Synchronize Scroll" ignores scrolling in background tabs.
   * Updated: French locale is updated. (by Menet)
   * Verified to work on Minefield 3.0b2pre.
 - 0.4.2007113001
   * Fixed: Now "Synchronize Scroll" ignores scrolling in other windows.
 - 0.4.2007112701
   * Improved: "Synchronize Scroll" button is available in the toolbar of split browsers.
   * Modified: "Back", "Forward", "Reload" and "Stop" buttons in split browsers are shown with system icon in Linux.
 - 0.4.2007112401
   * Improved: Split browsers can be scrolled synchronously with other panes.
 - 0.4.2007101002
   * Fixed: Toolbar buttons work correctly.
 - 0.4.2007101001
   * Improved: "Open New Tab", "View Page Source", "View Page Info", "Bookmak This Page" and "Bookmark All Tabs" keyboard shortcuts work for the active pane.
 - 0.4.2007100901
   * Improved: "Back", "Forward", "Stop", "Reload" and "Close Tab" keyboard shortcuts work for the active pane.
   * Added: Italian locale is available. (by Godai71@Extenzilla)
   * Fixed: Wrong locale for French description is corrected.
   * Updated: zh-TW, ko-KR and de-DE locales are updated.
 - 0.4.2007092501
   * French locale is updated.
 - 0.4.2007092101
   * Added: Spanish locale is available. (made by tito)
   * Improved: Split popup buttons are shown with fade-in/out effects.
   * Improved: You can show popup buttons only when you press "Shift" key.
 - 0.4.2007070801
   * Fixed: From the context menu, the focused browsing area is split correctly.
   * Fixed: "Split" command duplicates only the current tab correctly.
   * Fixed: Labels of "Tile Vertically" and "Tile Horizontally" are switched, in following locales: en-US, de-DE, fr-FR, hu-HU, ko-KR, and zh-TW.
 - 0.4.2007070401
   * Improved: Histories, scroll position and user typed values of forms are restored when you split the current page.
 - 0.4.2007061801
   * Improved: Scroll position and user typed values of forms in split browsers are stored/restored.
   * Fixed: URI strings or links are loaded in new split browser correctly when it is dropped on the popup button of the content area.
   * Fixed: Blank split browsers from tabs disappeared.
   * Fixed: Korean locale is updated.
 - 0.4.2007052102
   * Updated: Hungarian locale is updated. (by Mikes Kaszmán István)
 - 0.4.2007052101
   * Fixed: The credit of hu-HU translator is corrected.
 - 0.4.2007052001
   * Fixed: Broken behavior of "Split horizontally" and "vertically" disappeared.
   * Fixed: Selected tabs can be tiled horizontally or vertically correctly if it works with Multiple Tab Handler.
   * Fixed: "Tile tabs" feature closes tabs correctly even if TMP is available.
   * Fixed: Some buttons are available correctly in the menu of "Split" button.
   * Improved: Custom events to control split browser from web pages are available.
   * Updated: French locale is updated. (by menet)
   * Added: Hungarian locale is available. (by Mikes Kaszmán István)
 - 0.4.2007051501
   * Improved: New toolbar buttons, "Split(menu)", "Tile" and "Gather" are available.
   * Improved: [There is a new API. Scripts in webpages can split the content area.](http://piro.sakura.ne.jp/xul/#control)
   * Improved: Tabs opened instead of new windows are shown in split browsers correctly.
   * Improved: Shift-Click on relaod buttons reload without cache.
   * Fixed: The toolbar of split browsers stay editable if the URL bar is focused.
   * Fixed: Toolbar icons are shown at correct places.
   * Modified: Internal operations to show/hide main menu is changed.
   * Improved: Works on Minefield. (maybe)
 - 0.4.2007050701
   * Improved: [Tab Clicking Options](https://addons.mozilla.org/firefox/addon/260) is supported.
   * Updated: French locale is updated. (by Menet)
   * Updated: zh-TW locale is updated.（by Alan CHENG）
   * Fixed: Syntax errors in XUL and CSS codes are corrected.
 - 0.4.2007050602
   * Improved: Tabs can be tiled as multi-row automatically.
   * Fixed: "Align" are replaced to "Tile" in English locale.
 - 0.4.2007050601
   * Improved: You can tile tabs horizontally or vertically as split browsers. And, you can gather all of split browsers to tabs.
   * Improved: "Split" menu is available in the menu bar.
   * Improved: You can hide additional menu items in the context menu on tabs.
 - 0.3.2007042601
   * Improved: Works with [All-in-One Gestures](https://addons.mozilla.org/firefox/addon/12).
 - 0.3.2007042501
   * Improved: Works with [Multiple Tab Handler](http://piro.sakura.ne.jp/xul//xul/multipletab/) and [Informational Tab](http://piro.sakura.ne.jp/xul//xul/informationaltab/).
 - 0.3.2007041801
   * Improved: The icon is available for "Split" menus.
   * Improved: Navigation buttons can be shown in toolbars of split browsers permanently.
   * Improved: Works with [Firebug](https://addons.mozilla.org/firefox/addon/1843). (maybe)
   * Fixed: Google Notebook Extension popup is redrawed when left tabs of the current are closed.
   * Fixed: Wrongly blank "window.content" disappeared.
   * Modified: ScrapBook toolbar and Sidebars shown by MultiSidebar are moved to outside of the content area.
 - 0.3.2007041101
   * Fixed: Works with [Google Notebook Extension](http://www.google.com/notebook/?hl=ja).
   * Fixed: The hack for the [ScrapBook](https://addons.mozilla.org/firefox/addon/427) takes effect only for the ScrapBook, not other extensions.
 - 0.3.2007032902
   * Improved: Works with [ScrapBook](https://addons.mozilla.org/firefox/addon/427), [Grab and Drag](https://addons.mozilla.org/firefox/addon/1250). (maybe)
   * Fixed: Toolbars of split-browsers are shown even if the window is opened with no toolbar.
   * Fixed: Leaked memory for closed split-browsers disappeared. (maybe)
 - 0.3.2007032901
   * Fixed: Error on startup disappeared.
 - 0.3.2007030901
   * Fixed: zh-TW locale is available. (manifest file is updated correctly.)
 - 0.3.2007030801
   * Fixed: Option dialog works correctly.
   * Improved: The content area is made maximized correctly for maximized windows when there is any split browser.
   * Added: zh-TW locale is available. (made by Alan CHENG)
   * Updated: German locale is updated. (by ReinekeFux)
   * Updated: Korean locale is updated. (by 박찬규/sushizang)
 - 0.3.2007020401
   * Improved: Changes of some options are applied immediately.
   * Improved: Options of tabbed browsing are hidden if TBE or TMP is available.
   * Fixed: Split browsers are not collapsed wrongly if you set their toolbar can be collapsed.
   * Updated: French locale is updated. (by Menet)
 - 0.3.2007020301
   * Modified: Icons are updated. (inspired by kiwidesign)
   * Improved: Auto-focus feature to focus to split browsers by mouseover is available. (require you change the setting)
   * Improved: You can show "Collapse" and "Expand" button on the toolbar of split browsers.
   * Modified: Implementations of the feature to collapse/expand browsers are updated.
 - 0.3.2007013102
   * Updated: French locale is updated. (by Menet)
 - 0.3.2007013101
   * Fixed: Unexpected "jumping" behavior of narrowed split browsers disappeared.
   * Modified: Style rules for focused split browsers are modified.
   * Improved: New toolbar buttons to collapse/expand/close all of split browsers are available.
   * Added: Korean locale is available. (by 박찬규/sushizang)
   * Added: Icon for the add-on manager is available.
 - 0.3.2007012601
   * Improved: Double-click or middle-click collapse/expand a split browser, on its toolbar.
   * Modified: Always toolbars are shown in collapsed split-browsers.
   * Improved: The toolbar of focused split-browser is highlighted.
   * Improved: Text-zoom feature is available for split browsers, by "Ctrl-+", "Ctrl--" or Ctrl-wheel-scroll, if the browser is focused.
   * Improved: You can find terms in split browsers, if they are focused.
 - 0.3.2007012303
   * Updated: German locale is updated. (by ReinekeFux)
   * Updated: French locale is updated. (by Menet)
 - 0.3.2007012302
   * Fixed: "Split Tab to" works correctly.
 - 0.3.2007012301
   * Improved: Split Browser saves the state, which tab is selected.
   * Improved: "Split Tab to" feature duplicates tab with session histories.
   * Improved: A new option is available, to close tab after it is opened in split browser.
   * Improved: You can move and rearrange split browsers by drag and drop on their toolbar.
   * Improved: Drag-and-drop of links, bookmarks, etc. with Ctrl-key loads them in split browser even if you dropped them out of popup-buttons.
   * Fixed: The option works correctly, to show tabs in split browser always.
 - 0.3.2007012002
   * Improved: "Split Tab" menuitem is available for any tabbrowser.
   * Fixed: Error from "Split Tab" feature disappeared.
   * Updated: French locale is updated. (by Menet)
 - 0.3.2007012001
   * Improved: Tabbed browsing in split browser is available. (But this feature is disabled in environments TBE or TMP is installed, because they are designed for single "tabbrowser" in a window.)
   * Improved: "Close" and "Collapse" are available in the context menu on the toolbar of split browsers.
   * Fixed: A stupid mistake, "Left" and "Right" are wrongly switched in some locales, are corrected.
 - 0.2.2007011701
   * Fixed: Unexpected spaces in popup-buttons disappeared.
   * Fixed(partial): In Linux, dropped links, etc. to popup-buttons are loaded in new split browser. (But they cannot accept dropping links from the browser itself yet.)
   * Added: German locale is available. (made by ReinekeFux)
   * Improved: French locale is updated. (by Menet)
 - 0.2.2007011501
   * Improved: "Split Tab to" menu is available for the context menu on tabs. (Some codes are quoted from [Mozilla Zine Forum](http://forums.mozillazine.org/viewtopic.php?t=492430&amp;postdays=0&amp;postorder=asc&amp;postsperpage=15&amp;start=15&amp;sid=04bc6f7aca301596e88a1ae07996b887))
   * Modified: "Go" buttons are shown like as the Go-button in the main toolbar of Firefox 2.
   * Fixed: Features which observe drag-and-drop actions maybe work with this extension correctly. (Conflict with [Drag de Go](https://addons.mozilla.org/firefox/2918/) is solved.)
   * Added: French language pack is available. (made by Menet)
 - 0.2.2007011402
   * Fixed: Collapsed browsers are expanded automatically when a split browser beside it is closed.
 - 0.2.2007011401
   * Improved: Session histories of split browsers are saved and restored.
   * Improved: The title of the page is shown in the toolbar of tiny browsers. If you point the bar, "Back", "Forward", and other buttons become available.
   * Fixed: Buttons doesn't popup if the pointer through pointer over edges of content area.
   * Fixed: Broken order of tiny browser and splitter disappeared.
 - 0.1.2007011402
   * Fixed: Popup-buttons are hidden after a delay correctly.
   * Style rules are updated.
 - 0.1.2007011401
   * Modified: Popup-buttons are shown only on middle of top/bottom/left/right edges of content area.
   * Improved: Drag-and-drop action is available for popup-buttons.
   * Fixed: Style rules are updated. In some environments, a progressmeter is shown behind the location bar in tiny browser.
 - 0.1.2007011301
   * Released.
