/////////////////////////////////////////////////////////////////////
// Copyright (c) Autodesk, Inc. All rights reserved
// Written by Forge Partner Development
//
// Permission to use, copy, modify, and distribute this software in
// object code form for any purpose and without fee is hereby granted,
// provided that the above copyright notice appears in all copies and
// that both that copyright notice and the limited warranty and
// restricted rights notice below appear in all supporting
// documentation.
//
// AUTODESK PROVIDES THIS PROGRAM "AS IS" AND WITH ALL FAULTS.
// AUTODESK SPECIFICALLY DISCLAIMS ANY IMPLIED WARRANTY OF
// MERCHANTABILITY OR FITNESS FOR A PARTICULAR USE.  AUTODESK, INC.
// DOES NOT WARRANT THAT THE OPERATION OF THE PROGRAM WILL BE
// UNINTERRUPTED OR ERROR FREE.
/////////////////////////////////////////////////////////////////////

///////////////////////////////////////////////////////////////////////////////
// Rendering extension to illustrate integration
// with Design Automation for 3ds Max
// by Denis Grigor, May 2020
///////////////////////////////////////////////////////////////////////////////

class RenderingExtension extends Autodesk.Viewing.Extension {
    constructor(viewer, options) {
        super(viewer, options);
        this._group = null;
        this._button = null;
        this.configureUI = this.configureUI.bind(this);
        this.onToolbarCreated = this.onToolbarCreated.bind(this);
    }

    load() {
        console.log('RenderingExtension has been loaded');
        return true;
    }

    unload() {
        // Clean our UI elements if we added any
        if (this._group) {
            this._group.removeControl(this._button);
            if (this._group.getNumberOfControls() === 0) {
                this.viewer.toolbar.removeControl(this._group);
            }
        }
        console.log('RenderingExtension has been unloaded');
        return true;
    }

    onToolbarCreated() {
        // Create a new toolbar group if it doesn't exist
        this._group = this.viewer.toolbar.getControl('RenderingExtensionToolbar');
        if (!this._group) {
            this._group = new Autodesk.Viewing.UI.ControlGroup('RenderingExtensionToolbar');
            this.viewer.toolbar.addControl(this._group);
        }

        // Add a new button to the toolbar group
        this._button = new Autodesk.Viewing.UI.Button('RenderingDialogButton');

        this.configureUI();

        let renderDialog = this.renderDialog;
        if (renderDialog == null) {
            renderDialog = new RenderDialog(this.viewer, this.viewer.container,
                'renderDialog', 'Render Dialog', {"innerDiv": this.ui});
        }


        this._button.onClick = (ev) => {
            renderDialog.setVisible(!renderDialog.isVisible());
        };
        this._button.setToolTip('Render Dialog');
        this._button.addClass('RenderDialogIcon');
        this._group.addControl(this._button);


        let renderButton = document.getElementById("renderButton");
        console.log(renderButton);
        renderButton.onclick = (ev) => {
            console.log("RenderButtonClicked!", this.viewer.getCamera());
        }


    }

    configureUI() {
        this.ui = document.createElement("div");
        this.ui.id = "renderDialogUI";
        this.ui.classList.add("docking-panel-container-solid-color-a");
        this.ui.innerHTML = `
            <div id="renderDialogContent">
                <div><span>Some options here ... </span><button id="renderButton" type="button">Render</button></div>
                <div><img/></div>
                
            </div>
        `;

    }
}

// *******************************************
// Render Dialog
// *******************************************
class RenderDialog extends Autodesk.Viewing.UI.PropertyPanel {
    constructor(viewer, container, id, title, options) {
        super(container, id, title, options);
        this.viewer = viewer;

        Autodesk.Viewing.UI.DockingPanel.call(this, container, id, title, options);

        // the style of the docking panel
        // use this built-in style to support Themes on Viewer 4+
        this.container.classList.add('docking-panel-container-solid-color-a');
        this.container.id = "RenderDialogContainer";

        this.container.appendChild(options.innerDiv);
    }
}

Autodesk.Viewing.theExtensionManager.registerExtension('RenderingExtension', RenderingExtension);