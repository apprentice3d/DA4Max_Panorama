fn renderCamera cam w h = (
	render camera:cam outputsize:[w, h] outputfile:(sysInfo.currentdir + "/output/" + cam.name + ".png")
)

fn renderAllCameras w h = (
	for camera in cameras do (
		renderCamera camera w h
		print camera.name
	)
)

