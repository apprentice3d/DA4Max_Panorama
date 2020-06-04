function createCamera(camName) {

    let cam = NOP_VIEWER.getCamera()

    let matrix = cam.matrixWorld

    let position = new THREE.Vector3();
    let rotation = new THREE.Quaternion();
    let scale = new THREE.Vector3();

    matrix.decompose(position, rotation, scale)

    let offset = new THREE.Vector3(60.5, -60.5, 60.5) // for these magic numbers, check comment for getFragmentWorldMatrixByNodeId

    position.addVectors(position, offset);

    let aspect = cam.aspect;
    // let new_fov = cam.fov*aspect
    let new_fov = cam.fov*1.67;


    console.log('freecamera name:"%s" rotation:(quat %f %f %f %f) position:[%f, %f, %f] fov:%f',
        camName,
        rotation.x,
        rotation.y,
        rotation.z,
        rotation.w,
        position.x,
        position.y,
        position.z,
        new_fov)

}

function updateCamera(camera_name) {

    let image_height = NOP_VIEWER.canvas.height;
    let image_width = NOP_VIEWER.canvas.width;
    cam = NOP_VIEWER.getCamera()

    matrix = cam.matrixWorld
    var position = new THREE.Vector3();
    var rotation = new THREE.Quaternion();
    var scale = new THREE.Vector3();

    matrix.decompose(position, rotation, scale)

    console.log("======= REFERENCE ========")
    console.log("Position: " , matrix.getPosition());
    console.log("Rotation: " , rotation);

    console.log("==========================")

    let offset = new THREE.Vector3(60.5, -24.5, 60.5) // for these magic numbers, check comment for getFragmentWorldMatrixByNodeId

    let aspect = cam.aspect;

    position.addVectors(position, offset);

    // let new_fov = cam.fov*aspect;
    let new_fov = cam.fov*1.67;


    console.log('$%s.rotation = (quat %f %f %f %f) \n$%s.position = [%f, %f, %f] \n$%s.fov=%f',
        camera_name,
        rotation.x,
        rotation.y,
        rotation.z,
        rotation.w,
        camera_name,
        position.x,
        position.y,
        position.z,
        camera_name,
        new_fov)

    console.log('render camera:$%s outputsize:[%d, %d]',
        camera_name,
        image_width,
        image_height)
}










// used to get the offset, by getting Viewer scene coords of an object and comparing it with coords in Max scene
// for same object
function getFragmentWorldMatrixByNodeId(nodeId) {
    let viewer = NOP_VIEWER;

    let result = {
        fragId: [],
        matrix: [],
    };
    let tree = viewer.model.getData().instanceTree;
    tree.enumNodeFragments(nodeId, function (frag) {

        let fragProxy = viewer.impl.getFragmentProxy(viewer.model, frag);
        let matrix = new THREE.Matrix4();

        fragProxy.getWorldMatrix(matrix);

        result.fragId.push(frag);
        result.matrix.push(matrix);
    });
    return result;
}


//Open screenshot in new tab
NOP_VIEWER.getScreenShot(
    NOP_VIEWER.canvas.width,
    NOP_VIEWER.canvas.height, url => {
        let img = '<img src="'+url+'">';
        popup = window.open();
        popup.document.write(img);
        popup.print();
    });





/*
package main

import (
	"archive/zip"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
)

func main() {
	fmt.Println("Up and running")
	url := "https://developer.api.autodesk.com/oss/v2/signedresources/c4faf083-f7de-4eaf-a5f2-0adddcbb344d?region=US"
	filename := "./downloads/output.zip"
	destination := "./workfiles"

	//err := downloadFile(url, filename)
	err := downloadOutput(url, filename)

	if err != nil {
		log.Fatal(err)
	}

	err = unarchiveDownload(filename, destination)
	if err != nil {
		log.Fatal(err)
	}
}

func unarchiveDownload(filename, destination string) (err error) {

	var filenames []string

	content, err := zip.OpenReader(filename)
	if err != nil {
		return err
	}
	defer content.Close()

	for _, f := range content.File {
		fPath := filepath.Join(destination, f.Name)
		filenames = append(filenames, fPath)

		rc, err := f.Open()
		if err != nil {
			return err
		}
		defer rc.Close()

		out, err := os.Create(filename)
		if err != nil {
			return err
		}
		defer out.Close()

		_, err = io.Copy(out, rc)

	}
	return
}

func downloadFile(url, filename string) (err error) {
	res, err := http.Get(url)
	if err != nil {
		return
	}
	defer res.Body.Close()

	out, err := os.Create(filename)
	if err != nil {
		return
	}
	defer out.Close()

	_, err = io.Copy(out, res.Body)

	return
}

func downloadOutput(link, filename string) (err error){
	resp, err := http.Get(link)

	if err != nil {
		return err
	}
	defer resp.Body.Close()
	result, err := os.Create(filename)
	if err != nil {
		return err
	}
	defer result.Close()

	_, err = io.Copy(result, resp.Body)

	return err
}

 */