# pl-PL
# ***** BEGIN LICENSE BLOCK *****
# Version: MPL 1.1/GPL 2.0/LGPL 2.1
# 
# The contents of this file are subject to the Mozilla Public License Version
# 1.1 (the "License"); you may not use this file except in compliance with
# the License. You may obtain a copy of the License at
# http://www.mozilla.org/MPL/
# 
# Software distributed under the License is distributed on an "AS IS" basis,
# WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
# for the specific language governing rights and limitations under the
# License.
# 
# The Original Code is the Fox Splitter (formerly Split Browser).
# 
# The Initial Developer of the Original Code is SHIMODA Hiroshi.
# Portions created by the Initial Developer are Copyright (C) 2007-2008
# the Initial Developer. All Rights Reserved.
# 
# Contributor(s): Leszek(teo)Życzkowski <leszekz@gmail.com>
# 
# Alternatively, the contents of this file may be used under the terms of
# either the GNU General Public License Version 2 or later (the "GPL"), or
# the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
# in which case the provisions of the GPL or the LGPL are applicable instead
# of those above. If you wish to allow use of your version of this file only
# under the terms of either the GPL or the LGPL, and not to allow others to
# use your version of this file under the terms of the MPL, indicate your
# decision by deleting the provisions above and replace them with the notice
# and other provisions required by the LGPL or the GPL. If you do not delete
# the provisions above, a recipient may use your version of this file under
# the terms of any one of the MPL, the GPL or the LGPL.
# 
# ***** END LICENSE BLOCK *****

disableOldVersion.title=Do you want Firefox to be restarted?
disableOldVersion.text=The old version of Fox Splitter has been detected and disabled automatically. Do you want Firefox to be restarted now?


title=Fox Splitter - ustawienia

tab.general=Ogólne

shouldDuplicateOnSplit=Default behavior of split windows
shouldDuplicateOnSplit.true=Duplicate selected tab to the new window
shouldDuplicateOnSplit.false=Move selected tabs to the new window
generalButton.split.position=When the "Split" button in the toolbar is clicked
appMenu.split.position=When the "Split window" in the Firefox menu is clicked
importTabsFromClosedSibling=When a split window is closed
importTabsFromClosedSibling.nothing=Simply close the window
importTabsFromClosedSibling.hidden=Move hidden tabs to the beside window before the window is closed
importTabsFromClosedSibling.all=Move all tabs to the beside window before the window is closed

tab.drag=Drag and Drop

shouldDuplicateOnDrop=Default behavior of split windows from dragged tab
shouldDuplicateOnDrop.true=Duplicate dragged tab to the new window
shouldDuplicateOnDrop.false=Move dragged tab to the new window
dropZoneSize.before=Drop zone:
dropZoneSize.after=pixels from window edge
acceptDropDelay.before=Delay to allow dropping:
acceptDropDelay.after=msec.
handleDragWithShiftKey=Allow to drop only for dragging with Shift key
draggableAppButton=Unbind/bind windows by drag and drop of the Firefox Button

tab.appearance=Wygląd

shouldMinimalizeUI=Minimalize toolbar buttons in split windows
shouldAutoHideTabs=Hide tab bar automatically in split windows
shouldAutoHideTabs.note=(*require other addons which provide such feature)
hiddenUIInInactiveWindow=Available UIs in inactive windows
hiddenUIInInactiveWindow.note=(You can expand the browsing area by unchecking following items)
hiddenUIInInactiveWindow.menubar=Menu Bar
hiddenUIInInactiveWindow.toolbar=Navigation Toolbar items except Location Bar
hiddenUIInInactiveWindow.location=Location Bar
hiddenUIInInactiveWindow.bookmarks=Bookmarks Toolbar
hiddenUIInInactiveWindow.status=Status Bar
hiddenUIInInactiveWindow.extra=Extra Toolbars
hiddenUIInInactiveWindow.non-navigation=Toolbar items not related to navigation
hiddenUIInInactiveWindow.extra-toolbars=All other extra toolbars

tab.menu=Menu

appMenu.split=Append "%S" to the Firefox menu
viewMenu.split=Append "%S" to the "View" menu
context.splitFromLink=Append "%S" to the context menu on web pages
context.splitFromFrame=Append "%S" to the context menu on frames
tabContextMenu=Wyświetlaj w menu kontekstowym paska kart elementy:
tabSelectionMenu=Append following items to the tab selection menu
tabSelectionMenu.note=*Note: Another addon "Multiple Tab Handler" is required

tab.shortcut=Keyboard Shortcuts

shortcut.clear=Clear
shortcut.reset=Reset

tab.advanced=Advanced

syncScrollX=Enable synchronized scroll for horizontal scrolls
platformOffset.needToBeUpdated=Offset of positioning and resizing
platformOffset.description=On some platforms, Fox Splitter requires offset values to position/resize windows correctly avoiding Firefox's bug. They are automatically calculated on the initial startup. If you see wrongly positioned/sized split windows, correct these offsets manually.
platformOffset.forceUpdate=Re-calculate offsets now
platformOffset.x=Left
platformOffset.y=Top
platformOffset.width=Width
platformOffset.height=Height



ui.split.short=Split
ui.split.long=Split Browsing Window

ui.split.top.short=Wydziel na górze
ui.split.top.long=Split tab as Above window
ui.split.top.accesskey=a

ui.split.right.short=Wydziel po prawej
ui.split.right.long=Split tab as Right window
ui.split.right.accesskey=r

ui.split.bottom.short=Wydziel na dole
ui.split.bottom.long=Split tab as Below window
ui.split.bottom.accesskey=b

ui.split.left.short=Wydziel po lewej
ui.split.left.long=Split tab as Left window
ui.split.left.accesskey=l


ui.split.app.label=Split window
ui.split.app.accesskey=s
ui.split.view.label=Split window
ui.split.view.accesskey=s

ui.split.link.label=Open Link in New Split Window
ui.split.link.accesskey=s

ui.split.frame.label=Open Frame in New Split Window
ui.split.frame.accesskey=s

ui.split.tab.move.label=Move to Split Window
ui.split.tab.move.accesskey=s

ui.split.tab.duplicate.label=Duplicate in Split Window
ui.split.tab.duplicate.accesskey=u


ui.layout.grid.short=Sąsiadująco
ui.layout.grid.long=Ułóż wszystkie karty sąsiadująco
ui.layout.grid.selection=Tile tabs
ui.layout.grid.accesskey=t

ui.layout.x.short=Sąsiadująco w pionie
ui.layout.x.long=Ułóż wszystkie karty sąsiadująco w pionie
ui.layout.x.selection=Tile tabs Vertically
ui.layout.x.accesskey=v

ui.layout.y.short=Sąsiadująco w poziomie
ui.layout.y.long=Ułóż wszystkie karty sąsiadująco w poziomie
ui.layout.y.selection=Tile tabs Horizontally
ui.layout.y.accesskey=h

ui.gather.short=Gather
ui.gather.long=Gather all windows as tabs
ui.gather.accesskey=g

ui.collapseAll.short=Zwiń
ui.collapseAll.long=Collapse all windows
ui.collapseAll.accesskey=c

ui.expandAll.short=Rozwiń
ui.expandAll.long=Expand all windows
ui.expandAll.accesskey=e

ui.closeAll.short=Close All
ui.closeAll.long=Close all windows
ui.closeAll.accesskey=a

ui.closeOther.short=Close Other
ui.closeOther.long=Close other windows
ui.closeOther.accesskey=o

ui.syncScroll.short=Sync Scroll
ui.syncScroll.long=Synchronizuj przewijanie
ui.syncScroll.accesskey=s

ui.unbind.short=Unbind
ui.unbind.long=Unbind this window
ui.unbind.accesskey=u


tabView.importedGroup=Imported from other windows (%S)
