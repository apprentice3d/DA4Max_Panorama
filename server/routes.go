package server

import (
	"encoding/json"
	"fmt"
	"github.com/gorilla/websocket"
	"log"
	"net/http"
)


var clients []ClientRegistry
var urlJournal = make(map[uint64]string)
var jobs = make(map[string]uint64)
var taskJournal = make(map[uint64]RenderTaskRequest)
var scriptJournal = make(map[uint64]string)

func (service ForgeServices) GetToken(writer http.ResponseWriter, request *http.Request) {

	bearer, err := service.Oauth.Authenticate("viewables:read")
	if err != nil {
		writer.WriteHeader(http.StatusNotAcceptable)
		writer.Write([]byte(err.Error()))
		return
	}
	log.Printf("Received a token request: returning a token that will expire in %d\n", bearer.ExpiresIn)
	encoder := json.NewEncoder(writer)
	encoder.Encode(bearer)
}

func (service *ForgeServices) WsEndpoint(w http.ResponseWriter, r *http.Request) {
	service.upgrader = websocket.Upgrader{
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
	}

	service.upgrader.CheckOrigin = func(r *http.Request) bool {
		return true
	}

	ws, err := service.upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("Could not upgrade to WebSocket: ", err)
		fmt.Fprint(w, "This is a websocket channel")
		return
	}

	//ws.WriteMessage(1, []byte("Connected to ws channel"))
	ws.WriteJSON(struct {
		Status string `json:"status"`
	}{
		"Connected to ws channel",
	})

	service.connections = append(service.connections, ws)

	service.reader(ws)
}

func (service ForgeServices) DAResults(writer http.ResponseWriter, request *http.Request) {

	var result WorkItemSubmissionResponse

	decoder := json.NewDecoder(request.Body)

	err := decoder.Decode(&result)

	if err != nil {
		panic(err.Error())
	}

	jobid := result.Id
	taskId := jobs[jobid]
	downloadResults := urlJournal[taskId]
	taskInfo := taskJournal[taskId]

	//TODO: Research why there is a problem with storing connections in a map
	client := clients[0].Connection
	//client := service.connections[0]

	log.Printf("Received results of job %s with result: %s\n", result.Id, result.Status)

	if result.Status != "success" {
		return
	}

	filepaths, err := downloadAndUnarhiveResult(downloadResults, taskId)


	client.WriteJSON(ClientInform{
		TaskId: taskId,
		Type: taskInfo.Type,
		Status: result.Status,
		Urls: filepaths,
	})
}


