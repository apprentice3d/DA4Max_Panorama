package server

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/gorilla/websocket"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"text/template"
)


// reader deals with websocket job requests
func (service *ForgeServices) reader(conn *websocket.Conn) {
	for {

		var data RenderTaskRequest
		// read in the message
		_, pkg, err := conn.ReadMessage()
		//err := conn.ReadJSON(data)
		if err != nil {
			log.Println("Could not read message: ", err)
			return
		}

		err = json.Unmarshal(pkg, &data)

		if err != nil {
			log.Println("Could not unmarshal the message: ", err)
			return
		}

		log.Printf("Received a task: {%s , %d}\n", data.Type, data.TaskID)

		// TODO: Chenge this from global to service field
		//if tasks == nil {
		//	tasks = make(map[uint64]*websocket.Conn)
		//}
		//tasks[data.TaskID] = conn
		clients = append(clients, ClientRegistry{
			conn,
			data.TaskID,
		})

		taskJournal[data.TaskID] = data

		switch data.Type {
		case "rendering":
			go service.renderingJob(data)
		case "panorama":
			log.Println("Received a panorama task")
		}
	}
}

func (service *ForgeServices) renderingJob(task RenderTaskRequest) {

	scriptPath, err := createScriptFileFromTask(task)
	if err != nil {
		log.Println("Could not create script: ", err)
		return
	}
	log.Println("Created execution script: ", scriptPath)

	signedUrl, err := service.createObjectSelfSignedLink("store_for_da_max", fmt.Sprintf("output%d.zip", task.TaskID))
	if err != nil {
		log.Println("Could not create a signed url: ", err)
		return
	}
	log.Println("Created signed url: ", signedUrl)


	//TODO change the serverUrl to be autodetermined
	servicePath := "http://eace0c4d12c8.ngrok.io"
	workerID, err := service.SendWorkItem("Denix.RenderAllCamerasWithScriptParam+test",
		"https://sample-collection.s3.amazonaws.com/assets/models/radiosity.max",
		signedUrl,
		servicePath + scriptPath,
		servicePath + "/report")

	if err != nil {
		log.Println("Could not send the workitem: ", err)
		return
	}

	jobs[workerID.Id] = task.TaskID
	scriptJournal[task.TaskID] = scriptPath
	urlJournal[task.TaskID] = signedUrl

	log.Printf("Workitem created with ID %s for TaskID %d", workerID.Id, task.TaskID)
}

func createScriptFileFromTask(task RenderTaskRequest) (scriptPath string, err error) {
	taskParamas := struct {
		Posx   float32
		Posy   float32
		Posz   float32
		Rotx   float32
		Roty   float32
		Rotz   float32
		Rotw   float32
		Fov    float32
		Width  uint64
		Height uint64
		TaskID uint64
	}{
		task.Position[0],
		task.Position[1],
		task.Position[2],
		task.Rotation[0],
		task.Rotation[1],
		task.Rotation[2],
		task.Rotation[3],
		task.Fov,
		task.RenderingSize[0],
		task.RenderingSize[1],
		task.TaskID,
	}

	//TODO: Check how to pass to script template the task itself and avoid taskParams
	scriptTemplate, err := template.New("rendering").Parse("renderAtView  [{{.Posx}}, {{.Posy}}, {{.Posz}}] " +
		"[{{.Rotx}}, {{.Roty}}, {{.Rotz}}, {{.Rotw}}] {{.Fov}} \"{{.TaskID}}\" {{.Width}} {{.Height}}")

	if err != nil {
		return "", err
	}

	scriptFilePath := fmt.Sprintf("/scripts/job_%d.ms", taskParamas.TaskID)
	scriptFile, err := os.Create("www" + scriptFilePath)
	if err != nil {
		return "", err
	}
	defer scriptFile.Close()

	err = scriptTemplate.Execute(scriptFile, taskParamas)
	if err != nil {
		return "", err
	}
	return scriptFilePath, nil
}

func (service ForgeServices) createObjectSelfSignedLink(buketKey, objectName string) (urn string, err error) {
	//TODO: for each ID create a bucket, then create a selfsignedLink

	bearer, err := service.Oauth.Authenticate("data:read data:write bucket:read")
	if err != nil {
		return "", err
	}

	client := &http.Client{
	}
	req, err := http.NewRequest(
		"POST",
		fmt.Sprintf("https://developer.api.autodesk.com/oss/v2/buckets/%s/objects/%s/signed?access=readwrite",
			buketKey,
			objectName), strings.NewReader("{}"))

	if err != nil {
		return "", err
	}
	req.Header.Add("Content-Type", "application/json")
	req.Header.Add("Authorization", "Bearer " + bearer.AccessToken)

	res, err := client.Do(req)
	defer res.Body.Close()
	if err != nil {
		return "", err
	}

	if res.StatusCode != http.StatusOK {
		content, _ := ioutil.ReadAll(res.Body)
		err = errors.New("[" + strconv.Itoa(res.StatusCode) + "] " + string(content))
		return "", err
	}

	decoder := json.NewDecoder(res.Body)

	var result SignedObjectResponse

	err = decoder.Decode(&result)
	if err != nil {
		return "", err
	}
	return result.SignedUrl, nil


}

func (service ForgeServices) SendWorkItem(activityid, input, output, script, callbackURL string) (workItem WorkItemSubmissionResponse, err error) {
	task := http.Client{}

	workParams := WorkItemSubmissionRequest{
		activityid,
		WorkItemArguments{
			WorkItemArg{
				"get",
				script,
			},
			WorkItemArg{
				"get",
				input,
			},
			WorkItemArg{
				"put",
				output,
			},
			WorkItemArg{
				"post",
				callbackURL,
			},

		},
	}

	body, err := json.Marshal(workParams)

	if err != nil {
		return
	}

	req, err := http.NewRequest("POST",
		"https://developer.api.autodesk.com/da/us-east/v3/workitems",
		bytes.NewReader(body),
	)
	if err != nil {
		return
	}

	bearer, err := service.Oauth.Authenticate("viewables:read")
	if err != nil {
		return
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+bearer.AccessToken)
	response, err := task.Do(req)
	if err != nil {
		return
	}
	defer response.Body.Close()

	if response.StatusCode != http.StatusOK {
		content, _ := ioutil.ReadAll(response.Body)
		err = errors.New("[" + strconv.Itoa(response.StatusCode) + "] " + string(content))
		return
	}

	decoder := json.NewDecoder(response.Body)

	err = decoder.Decode(&workItem)

	return
}
