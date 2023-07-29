/* extension.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

/* exported init */

const Shell = imports.gi.Shell;
const Meta = imports.gi.Meta;
const GLib = imports.gi.GLib;
const St = imports.gi.St;
const Atk = imports.gi.Atk;
const Graphene = imports.gi.Graphene;
const Clutter = imports.gi.Clutter;
const GObject = imports.gi.GObject;
const Pango = imports.gi.Pango;
const GnomeDesktop = imports.gi.GnomeDesktop;

const Main = imports.ui.main;
const Calendar = imports.ui.calendar;
const Layout = imports.ui.layout;
const Panel = imports.ui.panel;
const PanelMenu = imports.ui.panelMenu;
const SessionMode = imports.ui.sessionMode;
const OverviewControls = imports.ui.overviewControls;
const DateMenu = imports.ui.dateMenu;
const WorkspaceThumbnail = imports.ui.workspaceThumbnail;
const WorkspacesView = imports.ui.workspacesView;
const SwipeTracker = imports.ui.swipeTracker;
const WorkspaceAnimation = imports.ui.workspaceAnimation;
const AltTab = imports.ui.altTab;

const INDICATOR_INACTIVE_OPACITY = 128;
const INDICATOR_INACTIVE_OPACITY_HOVER = 255;
const INDICATOR_INACTIVE_SCALE = 2 / 3;
const INDICATOR_INACTIVE_SCALE_PRESSED = 0.5;

var WorkspacesStripIndicator = GObject.registerClass({
    Signals: { 'page-activated': { param_types: [GObject.TYPE_INT] } },
}, class WorkspacesStripIndicator extends St.BoxLayout {
    _init(orientation = Clutter.Orientation.VERTICAL) {
        let vertical = orientation == Clutter.Orientation.VERTICAL;
        super._init({
            style_class: 'workspaces-strip-indicators',
            vertical,
            x_expand: true, y_expand: true,
            x_align: vertical ? Clutter.ActorAlign.END : Clutter.ActorAlign.CENTER,
            y_align: vertical ? Clutter.ActorAlign.CENTER : Clutter.ActorAlign.END,
            reactive: true,
            clip_to_allocation: true,
        });
        this._nPages = 0;
        this._currentPosition = 0;
        this._reactive = false;
        this._orientation = orientation;
    }

    vfunc_get_preferred_height(forWidth) {
        // We want to request the natural height of all our children as our
        // natural height, so we chain up to St.BoxLayout, but we only request 0
        // as minimum height, since it's not that important if some indicators
        // are not shown
        let [, natHeight] = super.vfunc_get_preferred_height(forWidth);
        return [0, natHeight];
    }

    setReactive(reactive) {
        let children = this.get_children();
        for (let i = 0; i < children.length; i++)
            children[i].reactive = reactive;

        this._reactive = reactive;
    }

    _createIndicator() {
        const indicator = new St.Button({
            style_class: 'workspaces-strip-indicator',
            button_mask: St.ButtonMask.ONE |
                         St.ButtonMask.TWO |
                         St.ButtonMask.THREE,
            y_align: Clutter.ActorAlign.CENTER,
            pivot_point: new Graphene.Point({ x: 0.5, y: 0.5 }),
            reactive: this._reactive,
        });
        indicator.child = new St.Widget({
            style_class: 'workspaces-strip-indicator-icon',
            y_align: Clutter.ActorAlign.CENTER,
            pivot_point: new Graphene.Point({ x: 0.5, y: 0.5 }),
        });
        indicator.connect('clicked', () => {
            this.emit('page-activated', this.get_children().indexOf(indicator));
        });
        indicator.connect('notify::hover', () => {
            this._updateIndicator(indicator, this.get_children().indexOf(indicator));
        });
        indicator.connect('notify::pressed', () => {
            this._updateIndicator(indicator, this.get_children().indexOf(indicator));
        });

        return indicator;
    }

    addPage(index) {
        const indicator = this._createIndicator();
        this._updateIndicator(indicator, index);

        this.insert_child_at_index(indicator, index);

        indicator.ensure_style();

        const wi = indicator.get_preferred_width(-1)[1];
        indicator.set_scale(0, 0);
        indicator.width = 0;
        indicator.opacity = 0;
        indicator.ease({
            width: wi,
            duration: 250,
            onStopped: () => {
                indicator.width = -1;

                // hack to make sure st paints the border correctly :(
                indicator.style = "";
                this._updateIndicator(indicator, index);

                indicator.ease({
                    scale_x: 1.0,
                    scale_y: 1.0,
                    opacity: 255,
                    duration: 250,
                });
            },
        });

        this._nPages += 1;
        this.visible = this._nPages > 1;

        this._updateActiveIndicatorSize();
    }

    removePage(index) {
        const indicator = this.get_children()[index];

        indicator._animatingOut = true;
        indicator.width = indicator.width;
        indicator.ease({
            scale_x: 0,
            scale_y: 0,
            opacity: 0,
            width: 0,
            duration: 250,
            onStopped: () => {
                delete indicator._animatingOut;
                indicator.destroy();
            },
        });

        this._nPages -= 1;
        this.visible = this._nPages > 1;

        this._updateActiveIndicatorSize();
    }

    _updateActiveIndicatorSize() {
        const indicator = this.get_children()[this._currentPosition];
        if (!indicator)
          return;
        const oldWidth = indicator.allocation.get_width();

        this._updateIndicator(indicator, this._currentPosition);

        indicator.ensure_style();
        const wi = indicator.get_preferred_width(-1)[1];

        indicator.width = oldWidth;
        indicator.ease({
            width: wi,
            duration: 300,
            onStopped: () => {
                indicator.width = -1;
            },
        });          
    }

    setNPages(nPages) {
        if (this._nPages == nPages)
            return;

        let diff = nPages - this._nPages;
        if (diff > 0) {
            for (let i = 0; i < diff; i++) {
                let pageIndex = this._nPages + i;

                const indicator = this._createIndicator();
                this._updateIndicator(indicator, pageIndex);

                this.add_child(indicator);
            }
        } else {
            let indicators = this.get_children().splice(diff);

            for (const indicator of indicators)
                indicator.destroy();
        }

        this._nPages = nPages;
        this.visible = this._nPages > 1;
    }

    _updateIndicator(indicator, pageIndex) {
        const distanceFromCurrent = Math.abs(this._currentPosition - pageIndex);
        const progress = Math.max(1 - distanceFromCurrent, 0);

        indicator.remove_transition("width");

        let opacity = Math.max(((4 - distanceFromCurrent) / 4) * 200, 70);
        if (progress > 0)
            opacity = ((3/4)*200) + (255 - ((3/4)*200)) * progress;
        let inactiveScale = indicator.pressed
            ? INDICATOR_INACTIVE_SCALE_PRESSED : INDICATOR_INACTIVE_SCALE;

        let scale = inactiveScale + (1 - inactiveScale) * progress;
      //  let opacity = inactiveOpacity + (255 - inactiveOpacity) * progress;
/*
      let indicatorSize;
        if (this._nPages <= 2)
            indicatorSize = 26;
        else if (this._nPages <= 5)
            indicatorSize = 20;
        else
            indicatorSize = 7;

        const heightPx = 0 + (7 - 0) * progress;
*/

      let indicatorSize;
        if (this._nPages <= 2)
            indicatorSize = 24;
        else if (this._nPages <= 5)
            indicatorSize = 20;
        else
            indicatorSize = 16;

        const heightPx = 0 + (0 - 0) * progress;

/*      let indicatorSize;
        if (this._nPages <= 2)
            indicatorSize = 20;
        else if (this._nPages <= 5)
            indicatorSize = 14;
        else
            indicatorSize = 4;

        const heightPx = 0 + (4 - 0) * progress;*/
        const widthPx = 0 + (indicatorSize - 0) * progress;

        const { scaleFactor } = St.ThemeContext.get_for_stage(global.stage);

        indicator.child.set_style(`width: ${widthPx.toFixed(0)}px; height: ${heightPx.toFixed(0)}px;`);

        indicator.child.set_scale(scale, scale);
        indicator.child.opacity = opacity;
    }

    setCurrentPosition(currentPosition) {
        this._currentPosition = currentPosition;

        const children = this.get_children();
        let i = 0;
        for (const child of children) {
            if (child._animatingOut)
                continue;

            this._updateIndicator(child, i);
            i++;
        }
    }

    get nPages() {
        return this._nPages;
    }
});

var OverviewButton = GObject.registerClass(
class OverviewButton extends PanelMenu.Button {
    _init() {
        super._init(0.0, null, true);
        this.accessible_role = Atk.Role.TOGGLE_BUTTON;

        this.name = 'panelActivities';

        /* Translators: If there is no suitable word for "Activities"
           in your language, you can use the word for "Overview". */
        this._pageIndicators =
            new WorkspacesStripIndicator(Clutter.Orientation.HORIZONTAL);
        this._pageIndicators.y_align = Clutter.ActorAlign.CENTER;
        this._pageIndicators.x_align = Clutter.ActorAlign.START;
        this.add_actor(this._pageIndicators);

        let workspaceManager = global.workspace_manager;

        this._pageIndicators.setNPages(workspaceManager.n_workspaces);

        workspaceManager.connectObject(
            'workspace-added', (m, index) => {
                this._pageIndicators.addPage(index);
            },
            'workspace-removed', (m, index) => {
                this._pageIndicators.removePage(index);
            }, this);

        Main.overview.connect('showing', () => {
            this.add_style_pseudo_class('overview');
            this.add_accessible_state(Atk.StateType.CHECKED);
        });
        Main.overview.connect('hiding', () => {
            this.remove_style_pseudo_class('overview');
            this.remove_accessible_state(Atk.StateType.CHECKED);
        });

        this._xdndTimeOut = 0;
    }

    setProgress(progress) {
        this._pageIndicators.setCurrentPosition(progress);
    }

    handleDragOver(source, _actor, _x, _y, _time) {
        if (source != Main.xdndHandler)
            return DND.DragMotionResult.CONTINUE;

        if (this._xdndTimeOut != 0)
            GLib.source_remove(this._xdndTimeOut);
        this._xdndTimeOut = GLib.timeout_add(GLib.PRIORITY_DEFAULT, BUTTON_DND_ACTIVATION_TIMEOUT, () => {
            this._xdndToggleOverview();
        });
        GLib.Source.set_name_by_id(this._xdndTimeOut, '[gnome-shell] this._xdndToggleOverview');

        return DND.DragMotionResult.CONTINUE;
    }

    vfunc_event(event) {
        if (event.type() == Clutter.EventType.TOUCH_END ||
            event.type() == Clutter.EventType.BUTTON_RELEASE) {
            if (Main.overview.shouldToggleByCornerOrButton())
                Main.overview.toggle();
        }

        return Clutter.EVENT_PROPAGATE;
    }

    vfunc_key_release_event(keyEvent) {
        let symbol = keyEvent.keyval;
        if (symbol == Clutter.KEY_Return || symbol == Clutter.KEY_space) {
            if (Main.overview.shouldToggleByCornerOrButton()) {
                Main.overview.toggle();
                return Clutter.EVENT_STOP;
            }
        }

        return Clutter.EVENT_PROPAGATE;
    }

    _xdndToggleOverview() {
        let [x, y] = global.get_pointer();
        let pickedActor = global.stage.get_actor_at_pos(Clutter.PickMode.REACTIVE, x, y);

        if (pickedActor == this && Main.overview.shouldToggleByCornerOrButton())
            Main.overview.toggle();

        GLib.source_remove(this._xdndTimeOut);
        this._xdndTimeOut = 0;
        return GLib.SOURCE_REMOVE;
    }
});

const WINDOW_ANIMATION_TIME = 250;
const WORKSPACE_SPACING = 100;

const MonitorGroup = GObject.registerClass({
    Properties: {
        'progress': GObject.ParamSpec.double(
            'progress', 'progress', 'progress',
            GObject.ParamFlags.READWRITE,
            -Infinity, Infinity, 0),
    },
}, class MonitorGroup extends St.Widget {
    _init(monitor, workspaceIndices, movingWindow) {
        super._init({
            clip_to_allocation: true,
            style_class: 'workspace-animation',
        });

        this._monitor = monitor;

        const constraint = new Layout.MonitorConstraint({ index: monitor.index });
        this.add_constraint(constraint);

        this._container = new Clutter.Actor();
        this.add_child(this._container);

        const stickyGroup = new WorkspaceAnimation.WorkspaceGroup(null, monitor, movingWindow);
        this.add_child(stickyGroup);

        this._workspaceGroups = [];

        const workspaceManager = global.workspace_manager;
        const vertical = workspaceManager.layout_rows === -1;
        const activeWorkspace = workspaceManager.get_active_workspace();

        let x = 0;
        let y = 0;

        for (const i of workspaceIndices) {
            const ws = workspaceManager.get_workspace_by_index(i);
            const fullscreen = ws.list_windows().some(w => w.get_monitor() === monitor.index && w.is_fullscreen());

            if (i > 0 && vertical && !fullscreen && monitor.index === Main.layoutManager.primaryIndex) {
                // We have to shift windows up or down by the height of the panel to prevent having a
                // visible gap between the windows while switching workspaces. Since fullscreen windows
                // hide the panel, they don't need to be shifted up or down.
                y -= Main.panel.height;
            }

            const group = new WorkspaceAnimation.WorkspaceGroup(ws, monitor, movingWindow);

            this._workspaceGroups.push(group);
            this._container.add_child(group);
            group.set_position(x, y);

            if (vertical)
                y += this.baseDistance;
            else if (Clutter.get_default_text_direction() === Clutter.TextDirection.RTL)
                x -= this.baseDistance;
            else
                x += this.baseDistance;
        }

        this.progress = this.getWorkspaceProgress(activeWorkspace);
    }

    get baseDistance() {
        const spacing = WORKSPACE_SPACING * St.ThemeContext.get_for_stage(global.stage).scale_factor;

        if (global.workspace_manager.layout_rows === -1)
            return this._monitor.height + spacing;
        else
            return this._monitor.width + spacing;
    }

    get progress() {
        if (global.workspace_manager.layout_rows === -1)
            return -this._container.y / this.baseDistance;
        else if (this.get_text_direction() === Clutter.TextDirection.RTL)
            return this._container.x / this.baseDistance;
        else
            return -this._container.x / this.baseDistance;
    }

    set progress(p) {
        if (this._monitor.index === Main.layoutManager.primaryIndex)
            Main.panel.statusArea.activities.setProgress(p);

        if (global.workspace_manager.layout_rows === -1)
            this._container.y = -Math.round(p * this.baseDistance);
        else if (this.get_text_direction() === Clutter.TextDirection.RTL)
            this._container.x = Math.round(p * this.baseDistance);
        else
            this._container.x = -Math.round(p * this.baseDistance);
    }

    get index() {
        return this._monitor.index;
    }

    getWorkspaceProgress(workspace) {
        const group = this._workspaceGroups.find(g =>
            g.workspace.index() === workspace.index());
        return this._getWorkspaceGroupProgress(group);
    }

    _getWorkspaceGroupProgress(group) {
        if (global.workspace_manager.layout_rows === -1)
            return group.y / this.baseDistance;
        else if (this.get_text_direction() === Clutter.TextDirection.RTL)
            return -group.x / this.baseDistance;
        else
            return group.x / this.baseDistance;
    }

    getSnapPoints() {
        return this._workspaceGroups.map(g =>
            this._getWorkspaceGroupProgress(g));
    }

    findClosestWorkspace(progress) {
        const distances = this.getSnapPoints().map(p =>
            Math.abs(p - progress));
        const index = distances.indexOf(Math.min(...distances));
        return this._workspaceGroups[index].workspace;
    }

    _interpolateProgress(progress, monitorGroup) {
        if (this.index === monitorGroup.index)
            return progress;

        const points1 = monitorGroup.getSnapPoints();
        const points2 = this.getSnapPoints();

        const upper = points1.indexOf(points1.find(p => p >= progress));
        const lower = points1.indexOf(points1.slice().reverse().find(p => p <= progress));

        if (points1[upper] === points1[lower])
            return points2[upper];

        const t = (progress - points1[lower]) / (points1[upper] - points1[lower]);

        return points2[lower] + (points2[upper] - points2[lower]) * t;
    }

    updateSwipeForMonitor(progress, monitorGroup) {
        this.progress = this._interpolateProgress(progress, monitorGroup);
    }
});

const CUSTOM_PANEL_ITEM_IMPLEMENTATIONS = {
    'activities': OverviewButton,
    'appMenu': Panel.AppMenuButton,
    'quickSettings': Panel.QuickSettings,
    'dateMenu': imports.ui.dateMenu.DateMenuButton,
    'a11y': imports.ui.status.accessibility.ATIndicator,
    'keyboard': imports.ui.status.keyboard.InputSourceIndicator,
    'dwellClick': imports.ui.status.dwellClick.DwellClickIndicator,
    'screenRecording': imports.ui.status.remoteAccess.ScreenRecordingIndicator,
    'screenSharing': imports.ui.status.remoteAccess.ScreenSharingIndicator,
};

class ScrollHandler {
    constructor() {
        this._lastScrollTime = 0;
        this._registerScroll(Main.panel.statusArea.activities);
    }

    destroy() {
        this._disconnectBinding?.();
        this._disconnectBinding = undefined;
    }

    _registerScroll(widget) {
        const scrollBinding = widget.connect('scroll-event', (actor, event) => {
            this._handleScroll(actor, event);
        });
        this._disconnectBinding = () => widget.disconnect(scrollBinding);
    }

    /**
     * Checks whether the debounce time since the last scroll event is exceeded, so a scroll event
     * can be accepted.
     *
     * Calling this function resets the debounce timer if the return value is `true`.
     *
     * @returns `true` if the scroll event should be accepted
     */
    _debounceTimeExceeded() {
        const debounceTime = 300;
        const now = Date.now();
        if (now >= this._lastScrollTime + debounceTime) {
            this._lastScrollTime = now;
            return true;
        } else {
            return false;
        }
    }

    _focusMostRecentWindowOnWorkspace(workspace) {
        const mostRecentWindowOnWorkspace = AltTab.getWindows(workspace).find(
            (window) => !window.is_on_all_workspaces(),
        );
        if (mostRecentWindowOnWorkspace) {
            workspace.activate_with_focus(mostRecentWindowOnWorkspace, global.get_current_time());
        }
    }

    _handleScroll(actor, event) {
        // Adapted from https://github.com/timbertson/gnome-shell-scroll-workspaces
        const source = event.get_source();
        if (source !== actor) {
            // Actors in the status area often have their own scroll events,
            if (Main.panel._rightBox?.contains?.(source))
                return Clutter.EVENT_PROPAGATE;
        }
        const currentIndex = global.workspace_manager.get_active_workspace_index();
        let newIndex;
        switch (event.get_scroll_direction()) {
            case Clutter.ScrollDirection.DOWN:
                newIndex = this._findVisibleWorkspace(currentIndex, -1);
                break;
            case Clutter.ScrollDirection.LEFT:
                newIndex = this._findVisibleWorkspace(currentIndex, -1);
                break;
            case Clutter.ScrollDirection.UP:
                newIndex = this._findVisibleWorkspace(currentIndex, 1);
                break;
            case Clutter.ScrollDirection.RIGHT:
                newIndex = this._findVisibleWorkspace(currentIndex, 1);
                break;
            default:
                return Clutter.EVENT_PROPAGATE;
        }
        if (newIndex !== null && this._debounceTimeExceeded()) {
            const workspace = global.workspace_manager.get_workspace_by_index(newIndex);
            if (workspace) {
                workspace.activate(global.get_current_time());
               // this._focusMostRecentWindowOnWorkspace(workspace);
            }
        }
        return Clutter.EVENT_STOP;
    }

    _findVisibleWorkspace(index, step) {
        while (true) {
            index += step;
            if (index < 0 || index >= global.workspace_manager.get_n_workspaces()) {
                break;
            }

            return index;
        }
        return null;
    }
}

class Extension {
    constructor() {
        this._panelAtBottom = true;

        this._disabled = true;

        this._workspacesViewInjections = {};
        this._panelInjections = {};
        this._workspaceAnimationInjections = {};
    }

    _useCustomWorkspacesViewImpls(use) {
        if (use) {
            this._workspacesViewInjections['_onScrollAdjustmentChanged'] = WorkspacesView.WorkspacesView.prototype._onScrollAdjustmentChanged;
            WorkspacesView.WorkspacesView.prototype._onScrollAdjustmentChanged = function () {
                if (!this.has_allocation())
                    return;

                const adj = this._scrollAdjustment;
                const allowSwitch =
                    adj.get_transition('value') === null && !this._gestureActive;

                let workspaceManager = global.workspace_manager;
                let active = workspaceManager.get_active_workspace_index();
                let current = Math.round(adj.value);

                if (allowSwitch && active !== current) {
                    if (!this._workspaces[current]) {
                        // The current workspace was destroyed. This could happen
                        // when you are on the last empty workspace, and consolidate
                        // windows using the thumbnail bar.
                        // In that case, the intended behavior is to stay on the empty
                        // workspace, which is the last one, so pick it.
                        current = this._workspaces.length - 1;
                    }

                    let metaWorkspace = this._workspaces[current].metaWorkspace;
                    metaWorkspace.activate(global.get_current_time());
                }

                if (this.mapped)
                    Main.panel.statusArea.activities.setProgress(adj.value);

                this._updateWorkspacesState();
                this.queue_relayout();
            };
        } else {
            WorkspacesView.WorkspacesView.prototype._onScrollAdjustmentChanged = this._workspacesViewInjections['_onScrollAdjustmentChanged'];
            delete this._workspacesViewInjections['_onScrollAdjustmentChanged'];
        }
    }

    _useCustomWorkspaceAnimationImpls(use) {
        if (use) {
            this._workspaceAnimationInjections['animateSwitch'] = WorkspaceAnimation.WorkspaceAnimationController.prototype.animateSwitch;
            WorkspaceAnimation.WorkspaceAnimationController.prototype.animateSwitch = function (from, to, direction, onComplete) {
                this._swipeTracker.enabled = false;

                let workspaceIndices = [];

                switch (direction) {
                case Meta.MotionDirection.UP:
                case Meta.MotionDirection.LEFT:
                case Meta.MotionDirection.UP_LEFT:
                case Meta.MotionDirection.UP_RIGHT:
                    workspaceIndices = [to, from];
                    break;

                case Meta.MotionDirection.DOWN:
                case Meta.MotionDirection.RIGHT:
                case Meta.MotionDirection.DOWN_LEFT:
                case Meta.MotionDirection.DOWN_RIGHT:
                    workspaceIndices = [from, to];
                    break;
                }

                if (Clutter.get_default_text_direction() === Clutter.TextDirection.RTL &&
                    direction !== Meta.MotionDirection.UP &&
                    direction !== Meta.MotionDirection.DOWN)
                    workspaceIndices.reverse();

                this._prepareWorkspaceSwitch();
                this._switchData.inProgress = true;

                const fromWs = global.workspace_manager.get_workspace_by_index(from);
                const toWs = global.workspace_manager.get_workspace_by_index(to);

                for (const monitorGroup of this._switchData.monitors) {
                    monitorGroup.progress = monitorGroup.getWorkspaceProgress(fromWs);
                    const progress = monitorGroup.getWorkspaceProgress(toWs);

                    const params = {
                        duration: WINDOW_ANIMATION_TIME,
                        mode: Clutter.AnimationMode.EASE_OUT_CUBIC,
                    };

                    if (monitorGroup.index === Main.layoutManager.primaryIndex) {
                        params.onComplete = () => {
                            this._finishWorkspaceSwitch(this._switchData);
                            onComplete();
                            this._swipeTracker.enabled = true;
                        };
                    }

                    monitorGroup.ease_property('progress', progress, params);
                }
            };

            this._workspaceAnimationInjections['animateSwitch'] = WorkspaceAnimation.WorkspaceAnimationController.prototype._prepareWorkspaceSwitch;
            WorkspaceAnimation.WorkspaceAnimationController.prototype._prepareWorkspaceSwitch = function (workspaceIndices) {
                if (this._switchData)
                    return;

                const workspaceManager = global.workspace_manager;
                const nWorkspaces = workspaceManager.get_n_workspaces();

                const switchData = {};

                this._switchData = switchData;
                switchData.monitors = [];

                switchData.gestureActivated = false;
                switchData.inProgress = false;

                if (!workspaceIndices)
                    workspaceIndices = [...Array(nWorkspaces).keys()];

                const monitors = Meta.prefs_get_workspaces_only_on_primary()
                    ? [Main.layoutManager.primaryMonitor] : Main.layoutManager.monitors;

                for (const monitor of monitors) {
                    if (Meta.prefs_get_workspaces_only_on_primary() &&
                        monitor.index !== Main.layoutManager.primaryIndex)
                        continue;

                    const group = new MonitorGroup(monitor, workspaceIndices, this.movingWindow);

                    Main.uiGroup.insert_child_above(group, global.window_group);

                    switchData.monitors.push(group);
                }

                Meta.disable_unredirect_for_display(global.display);
            };
        } else {
            WorkspaceAnimation.WorkspaceAnimationController.prototype._prepareWorkspaceSwitch = this._workspaceAnimationInjections['_prepareWorkspaceSwitch'];
            delete this._workspaceAnimationInjections['_prepareWorkspaceSwitch'];

            WorkspaceAnimation.WorkspaceAnimationController.prototype.animateSwitch = this._workspaceAnimationInjections['animateSwitch'];
            delete this._workspaceAnimationInjections['animateSwitch'];
        }
    }

    _useCustomPanelImpls(use) {
        if (use) {
            this._panelInjections['_ensureIndicator'] = Panel.Panel.prototype._ensureIndicator;
            Panel.Panel.prototype._ensureIndicator = function (role) {
                let indicator = this.statusArea[role];
                if (!indicator) {
                    let constructor = CUSTOM_PANEL_ITEM_IMPLEMENTATIONS[role];
                    if (!constructor) {
                        // This icon is not implemented (this is a bug)
                        return null;
                    }
                    indicator = new constructor(this);
                    this.statusArea[role] = indicator;
                }
                return indicator;
            };

            this._panelInjections['_hideIndicators'] = Panel.Panel.prototype._hideIndicators;
            Panel.Panel.prototype._hideIndicators = function () {
                for (let role in CUSTOM_PANEL_ITEM_IMPLEMENTATIONS) {
                    let indicator = this.statusArea[role];
                    if (!indicator)
                        continue;
                    indicator.container.hide();
                }
            };
        } else {
            Panel.Panel.prototype._hideIndicators = this._panelInjections['_hideIndicators'];
            delete this._panelInjections['_hideIndicators'];

            Panel.Panel.prototype._ensureIndicator = this._panelInjections['_ensureIndicator'];
            delete this._panelInjections['_ensureIndicator'];
        }


        Main.panel.statusArea['activities'].destroy();

        Main.panel._updatePanel();
    }

    _useCustomDateMenu(enable) {
        const dateMenu = Main.panel.statusArea['dateMenu'];

        if (enable) {
            dateMenu._indicator.hide();
            Main.messageTray._bannerBin.y_align = Clutter.ActorAlign.END;
        } else {
            dateMenu._indicator.show();
            Main.messageTray._bannerBin.y_align = Clutter.ActorAlign.START;
        }
    }

    _updateUserSessionMode(enable) {
        // fun fun, this appears to make accessing the const work
        const test = SessionMode._modes;

        if (enable) {
            this._oldSessionMode = SessionMode._modes.user.panel.left;
            SessionMode._modes.user.panel.left = ['activities'];
        } else {
            SessionMode._modes.user.panel.left = this._oldSessionMode;
            delete this._oldSessionMode;
        }
    }

    enable() {
        if (!this._disabled)
            return;

        this._disabled = false;

        this._updateUserSessionMode(true);

        this._useCustomWorkspaceAnimationImpls(true);
        this._useCustomWorkspacesViewImpls(true);
        this._useCustomPanelImpls(true);

        this._scrollHandler = new ScrollHandler();
    }

    disable() {
        if (this._disabled)
            return;

        this._disabled = true;

        this._scrollHandler.destroy();

        this._updateUserSessionMode(false);

        this._useCustomWorkspaceAnimationImpls(false);
        this._useCustomWorkspacesViewImpls(false);
        this._useCustomPanelImpls(false);
    }
}

function init() {
    return new Extension();
}
