--render a camera given camera name and desired image size
fn renderCamera cam w h = (
	render camera:cam outputsize:[w, h] outputfile:(sysInfo.currentdir + "/output/" + cam.name + ".png")
)


--iterate through all cameras in scene and create a rendering for each one providing desired image size
fn renderAllCameras w h = (
	for camera in cameras do (
		renderCamera camera w h
		print camera.name
	)
)


--creates box images for panorama at give position and desired size
fn renderPanoramaAtPoint x y z size = (

	controller = dummy position:[x, y, z]
	cam = freecamera position:[x, y, z] fov:90
	cam.parent = controller
	rotate cam 90 y_axis
	rotate cam 90 x_axis

	-- FRONT --
	render camera:cam vfb:false outputsize:[size, size] outputfile:(sysInfo.currentdir + "/output/front.png")
	rotate controller 90 z_axis

	-- RIGHT --
	render camera:cam vfb:false outputsize:[size, size] outputfile:(sysInfo.currentdir + "/output/right.png")
	rotate controller 90 z_axis

	-- BACK --
	render camera:cam vfb:false outputsize:[size, size] outputfile:(sysInfo.currentdir + "/output/back.png")
	rotate controller 90 z_axis

	-- LEFT --
	render camera:cam vfb:false outputsize:[size, size] outputfile:(sysInfo.currentdir + "/output/left.png")
	rotate controller 90 z_axis

	-- TOP
	rotate cam 90 y_axis
	render camera:cam vfb:false outputsize:[size, size] outputfile:(sysInfo.currentdir + "/output/top.png")


	-- BOTTOM
	rotate cam -180 y_axis
	render camera:cam vfb:false outputsize:[size, size] outputfile:(sysInfo.currentdir + "/output/bottom.png")
)


--render a view at certain position. view can be ["front", "right", "left", "back", "top", "bottom"
--used to get distributed render box images for panorama
fn renderViewAtPosition x y z size view = (
	controller = dummy position:[x, y, z]
	cam = freecamera position:[x, y, z] fov:90
	cam.parent = controller
	rotate cam 90 y_axis
	rotate cam 90 x_axis


	if view == "right" do ( rotate controller 90 z_axis)
	if view == "left" do (rotate controller -90 z_axis)
	if view == "back" do (rotate controller 180 z_axis)
	if view == "top" do (rotate controller 90 y_axis)
	if view == "bottom" do (rotate controller -90 y_axis)

	render camera:cam vfb:false outputsize:[size, size] outputfile:(sysInfo.currentdir + "/output/" + view + ".png")
)

--render a view given position, rotation and FOV
--used to match Viewer camera and get rendering of that camera
fn renderAtView pos rot fov name w h = (
	cam = freecamera fov:fov
	cam.position = [pos.x, pos.y, pos.z]
	cam.rotation = (quat rot.x rot.y rot.z rot.w)
	render camera:cam outputsize:[w, h] outputfile:(sysInfo.currentdir + "/output/" + name + ".png")

)
