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
        this.renderButton = null;
        this.configureUI = this.configureUI.bind(this);
        this.onToolbarCreated = this.onToolbarCreated.bind(this);
        this.renderingTask = {}
        this.activeRenderingScreen = null;

        this.renderDialog = null;
        this.panoramaDialog = null;

        this.updateRenderTaskList = this.updateRenderTaskList.bind(this);
        this.setupRenderTrigger = this.setupRenderTrigger.bind(this);
    }

    load() {
        console.log('RenderingExtension has been loaded');
        return true;
    }

    unload() {
        // Clean our UI elements if we added any
        if (this._group) {
            this._group.removeControl(this.renderButton);
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


        this.configureUI();

        // Render Dialog Setup
        let renderDialog = this.renderDialog;
        if (renderDialog == null) {
            renderDialog = new RenderDialog(this.viewer, this.viewer.container,
                'renderDialog', 'Render Dialog', {"innerDiv": this.renderUI});
        }

        this.renderButton = new Autodesk.Viewing.UI.Button('RenderingDialogButton');
        this.renderButton.onClick = (ev) => {
            renderDialog.setVisible(!renderDialog.isVisible());
        };
        this.renderButton.setToolTip('Render Dialog');
        this.renderButton.addClass('RenderDialogIcon');
        this._group.addControl(this.renderButton);

        this.setupRenderTrigger();

        // let renderTrigger = document.getElementById("renderButton");
        // renderTrigger.onclick = (ev) => {
        //     let renderingPlacer = document.getElementById("renderingImage");
        //     this.viewer.getScreenShot(
        //         this.viewer.canvas.width,
        //         this.viewer.canvas.height, url => {
        //             renderingPlacer.src = url;
        //             this.renderingTask[Date.now()] = {screenShot: url,};
        //
        //             this.updateRenderTaskList();
        //             console.log(this.renderingTask)
        //             //TODO: submit rendering work
        //         })
        // }


        // Panorama Dialog Setup
        let panoramaDialog = this.panoramaDialog;
        if (panoramaDialog == null) {
            panoramaDialog = new PanoramaDialog(this.viewer, this.viewer.container,
                'panoramaDialog', 'Panorama Dialog', {"innerDiv": this.panoramaUI});
        }

        this.panoramaButton = new Autodesk.Viewing.UI.Button('PanoramaDialogButton');
        this.panoramaButton.onClick = (ev) => {
            panoramaDialog.setVisible(!panoramaDialog.isVisible());
        };
        this.panoramaButton.setToolTip('Panorama Rendering Dialog');
        this.panoramaButton.addClass('PanoramaDialogIcon');
        this._group.addControl(this.panoramaButton);


        // let panoramaTrigger = document.getElementById("panoramaButton");
        // panoramaTrigger.onclick = (ev) => {
        //     console.log("Panorama button clicked.");
        //
        // }

    }

    configureUI() {
        this.renderUI = document.createElement("div");
        this.renderUI.id = "renderDialogUI";
        this.renderUI.classList.add("docking-panel-container-solid-color-a");
        this.renderUI.innerHTML = `
            <div id="renderDialogContent">
                <div></div>
                <div id="workarea">
                    <div id="imageContainer"><img id="renderingImage"></div>
                    <div id="rendertasks"></div>
                </div>
                
            </div>
        `;



        this.panoramaUI = document.createElement("div");
        this.panoramaUI.id = "panoramaDialogUI";
        this.panoramaUI.classList.add("docking-panel-container-solid-color-a");
        this.panoramaUI.innerHTML = `
            <div id="panoramaDialogContent">
                <div><span>Some options here ... </span><button id="renderButton" type="button">Render</button></div>
                <div><img/></div>
                
            </div>
        `;

    }

    setupRenderTrigger() {

        //TODO: remove this restriction when understood how to deal with x-overflow in Panel
        if(Object.keys(this.renderingTask).length > 3) {return;}

        this.viewer.clearSelection();// TODO: Check why slection appears in screenshot

        let rendertasklist = document.getElementById("rendertasks");
        rendertasklist.innerHTML += `<div id="renderSubmit"><h1>RENDER</h1></div>`;
        let renderTrigger = document.getElementById("renderSubmit");
        renderTrigger.onclick = (ev) => {
            let renderingPlacer = document.getElementById("renderingImage");
            this.viewer.getScreenShot(
                this.viewer.canvas.width,
                this.viewer.canvas.height, url => {
                    renderingPlacer.src = url;
                    this.renderingTask[Date.now()] = {screenShot: url,};

                    this.updateRenderTaskList();
                    console.log(this.renderingTask)
                    //TODO: submit rendering work
                })
        }
    }

    updateRenderTaskList() {
        let rendertasklist = document.getElementById("rendertasks");
        rendertasklist.innerHTML = "";
        let taskKeys = Object.keys(this.renderingTask);
        taskKeys.forEach(key => {
            rendertasklist.innerHTML += `
            <img class="renderPreview" id=${key} src=${this.renderingTask[key].screenShot}>
            `
        })

        this.setupRenderTrigger();
        let taskListScreens = document.getElementsByClassName("renderPreview");
        taskListScreens.forEach(img => img.onclick = () => {
            document.getElementById("renderingImage").src = img.src;
        })
        // document.getElementById(key).onclick = () => {
        //     // document.getElementById("renderingImage").src = this.renderingTask[key].screenShot;
        //     console.log("Clicked on ", key);
        // }

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


// *******************************************
// Panorama Dialog
// *******************************************
class PanoramaDialog extends Autodesk.Viewing.UI.PropertyPanel {
    constructor(viewer, container, id, title, options) {
        super(container, id, title, options);
        this.viewer = viewer;

        Autodesk.Viewing.UI.DockingPanel.call(this, container, id, title, options);

        // the style of the docking panel
        // use this built-in style to support Themes on Viewer 4+
        this.container.classList.add('docking-panel-container-solid-color-a');
        this.container.id = "PanoramaDialogContainer";

        this.container.appendChild(options.innerDiv);
    }
}

Autodesk.Viewing.theExtensionManager.registerExtension('RenderingExtension', RenderingExtension);