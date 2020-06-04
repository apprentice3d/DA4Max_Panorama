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
        this.renderingPanoramaTask = {}
        this.activeRenderingScreen = null;

        this.renderDialog = null;
        this.panoramaDialog = null;


        this.ws_address = "ws://localhost:8080/ws";
        this.websocket = null;
        this.retry_connection_counter = 0;
        this.maximum_connection_attempts = 10;


        this.setupConnection = this.setupConnection.bind(this);
        this.onOpen = this.onOpen.bind(this);
        this.onClose = this.onClose.bind(this);
        this.onMessage = this.onMessage.bind(this);
        this.onError = this.onError.bind(this);


        this.updateRenderTaskList = this.updateRenderTaskList.bind(this);
        this.updatePanoramaTaskList = this.updatePanoramaTaskList.bind(this);
        this.setupRenderTrigger = this.setupRenderTrigger.bind(this);
        this.setupPanoramaTrigger = this.setupPanoramaTrigger.bind(this);

        this.getCameraCoordinates = this.getCameraCoordinates.bind(this);
    }

    load() {
        console.log('RenderingExtension has been loaded');
        this.setupConnection(this.ws_address);
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

        this.setupRenderTrigger();
        this.setupPanoramaTrigger();

    }

    configureUI() {
        this.renderUI = document.createElement("div");
        this.renderUI.id = "renderDialogUI";
        this.renderUI.classList.add("docking-panel-container-solid-color-a");
        this.renderUI.innerHTML = `
            <div id="renderDialogContent">
                <div></div>
                <div class="workarea">
                    <div id="imageContainer" class="imageContainerClass" ><img id="renderingImage" class="imagePresentation"></div>
                    <div id="rendertasks" class="renderlist"></div>
                </div>
                
            </div>
        `;

        this.panoramaUI = document.createElement("div");
        this.panoramaUI.id = "panoramaDialogUI";
        this.panoramaUI.classList.add("docking-panel-container-solid-color-a");
        this.panoramaUI.innerHTML = `
            <div id="PanoramaDialogContent">
                <div></div>
                <div class="workarea">
                    <div id="panoramaContainer" class="imageContainerClass"><img id="renderingPanorama" class="imagePresentation" src="" alt="No renderings"></div>
                    <div id="renderpanoramatasks" class="renderlist"></div>
                </div>
                
            </div>
        `;

    }

    setupRenderTrigger() {

        //TODO: remove this restriction when understood how to deal with x-overflow in Panel
        if(Object.keys(this.renderingTask).length > 3) {return;}

        this.viewer.clearSelection();// TODO: Check why slection appears in screenshot

        let urn = this.viewer.model.loader.svfUrn;
        let rendertasklist = document.getElementById("rendertasks");
        rendertasklist.innerHTML += `<div id="renderSubmit" class="renderTrigger"><h1>RENDER</h1></div>`;
        let renderTrigger = document.getElementById("renderSubmit");
        renderTrigger.onclick = (ev) => {
            let taskID = Date.now();
            let renderingPlacer = document.getElementById("renderingImage");
            this.viewer.getScreenShot(
                this.viewer.canvas.width,
                this.viewer.canvas.height, url => {
                    renderingPlacer.src = url;
                    this.renderingTask[taskID] = {screenShot: url,};

                    this.updateRenderTaskList();


                })
            //TODO: submit rendering work
            const cameraParams = this.getCameraCoordinates();
            const renderJob = {
                "id": urn,
                "task_id": taskID,
                "type": "rendering",
                "position": cameraParams.position,
                "rotation": cameraParams.rotation,
                "fov": cameraParams.fov,
                //TODO: make rendering size as an option to user
                "rendering_size": cameraParams.renderingSize
            }
            this.websocket.send(JSON.stringify(renderJob));

            console.log("RenderJob submitted: ", renderJob);
        }
    }


    setupPanoramaTrigger() {

        //TODO: remove this restriction when understood how to deal with x-overflow in Panel
        if(Object.keys(this.renderingPanoramaTask).length > 3) {return;}

        this.viewer.clearSelection();// TODO: Check why selection appears in screenshot

        let urn = this.viewer.model.loader.svfUrn;
        let renderpanoramatasklist = document.getElementById("renderpanoramatasks");
        renderpanoramatasklist.innerHTML += `<div id="panoramaSubmit" class="renderTrigger"><h1>RENDER</h1></div>`;
        let renderSubmit = document.getElementById("panoramaSubmit");
        renderSubmit.onclick = (ev) => {
            let taskID = Date.now();
            let renderingPlacer = document.getElementById("renderingPanorama");
            this.viewer.getScreenShot(
                this.viewer.canvas.width,
                this.viewer.canvas.height, url => {
                    renderingPlacer.src = url;
                    this.renderingPanoramaTask[taskID] = {screenShot: url,};

                    this.updatePanoramaTaskList();


                })
            //TODO: submit rendering work
            const cameraParams = this.getCameraCoordinates();
            const renderJob = {
                "id": urn,
                "task_id": taskID,
                "type": "panorama",
                "position": cameraParams.position,
                "rotation": cameraParams.rotation,
                "fov": cameraParams.fov,
                //TODO: make rendering size as an option to user
                "rendering_size": cameraParams.renderingSize
            }
            this.websocket.send(JSON.stringify(renderJob));

            console.log("RenderJob submitted: ", renderJob);
        }
    }

    getCameraCoordinates() {
        let cam = this.viewer.getCamera()

        let matrix = cam.matrixWorld

        let position = new THREE.Vector3();
        let rotation = new THREE.Quaternion();
        let scale = new THREE.Vector3();

        matrix.decompose(position, rotation, scale)

        //TODO: replace magic numbers with derived ones
        let offset = new THREE.Vector3(60.5, -24.5, 60.5)

        position.addVectors(position, offset);

        let aspect = cam.aspect;

        //TODO: derive the 1.67 multiplicator
        let new_fov = cam.fov*1.67;

        return {
            position: position.toArray(),
            rotation: rotation.toArray(),
            fov: new_fov,
            renderingSize: [this.viewer.canvas.width, this.viewer.canvas.height]
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

    updatePanoramaTaskList() {
        let rendertasklist = document.getElementById("renderpanoramatasks");
        rendertasklist.innerHTML = "";
        let taskKeys = Object.keys(this.renderingPanoramaTask);
        taskKeys.forEach(key => {
            rendertasklist.innerHTML += `
            <img class="renderPreview" id=${key} src=${this.renderingPanoramaTask[key].screenShot}>
            `
        })

        this.setupPanoramaTrigger();
        let taskListScreens = document.getElementsByClassName("renderPreview");
        taskListScreens.forEach(img => img.onclick = () => {
            document.getElementById("renderingPanorama").src = img.src;
        })
        // document.getElementById(key).onclick = () => {
        //     // document.getElementById("renderingImage").src = this.renderingTask[key].screenShot;
        //     console.log("Clicked on ", key);
        // }

    }


    /*
     * CONNECTION PART
     */

    setupConnection(url) {
        this.websocket = new WebSocket(url);
        this.websocket.onopen = this.onOpen;
        this.websocket.onclose = this.onClose;
        this.websocket.onmessage = this.onMessage;
        this.websocket.onerror = this.onError;
    }


    onOpen(evt) {
        console.info("Connection opened: ", evt);
        this.retry_connection_counter = 0;

    }

    onClose(evt) {
        console.log("Connection closed: ", evt);

        let reconnect = (timeout) => {
            console.log("TIMEOUT:", timeout);
            setTimeout(() => {
                if (
                    this.retry_connection_counter++ < this.maximum_connection_attempts
                    && this.websocket.type !== "open") {
                    console.log("Retrying connection ...", this.retry_connection_counter);
                    this.setupConnection(this.ws_address);
                } else {
                    console.log("Stopped connecting!");
                }
            },timeout)
        };

        reconnect(1000*this.retry_connection_counter);
    }

    onMessage(evt) {
        let data;
        try {
            data = JSON.parse(evt.data);
        } catch (err) {
            console.log("Received message is not a JSON: ", evt.data);
            return
        }
        console.log("RECEIVED:", data);
    }

    onError(evt) {
        console.log("Error received: ", evt);
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