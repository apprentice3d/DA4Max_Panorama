package server

import (
	"github.com/apprentice3d/forge-api-go-client/oauth"
	"github.com/gorilla/websocket"
)

// ForgeServices holds the necessary references to Forge services
type ForgeServices struct {
	Oauth oauth.TwoLeggedAuth
	connections []*websocket.Conn
	upgrader websocket.Upgrader
}

type ClientRegistry struct {
	Connection *websocket.Conn
	TaskID uint64
}

// RenderTaskRequest holds the rendering data received from the client
type RenderTaskRequest struct {
	Id string `json:"id"`
	TaskID uint64 `json:"task_id"`
	Type string	`json:"type"`
	Position []float32 `json:"position"`
	Rotation []float32 `json:"rotation,omitempty"`
	Fov float32	`json:"fov"`
	RenderingSize []uint64	`json:"rendering_size"`
}

// SignedObjectResponse holds data received when asked for a signed url
type SignedObjectResponse struct {
	SignedUrl string `json:"signedUrl"`
	Expiration uint64 `json:"expiration"`
	SingleUse bool	`json:"singleUse"`
}



type WorkItemArg struct {
	Verb string `json:"verb"`
	Url string `json:"url"`
}

type WorkItemArguments struct {
	Script WorkItemArg `json:"Script"`
	InputFile WorkItemArg `json:"InputFile"`
	OutputFile WorkItemArg `json:"OutputFile"`
	OnComplete WorkItemArg	`json:"onComplete,omitempty"`
}

type WorkItemSubmissionRequest struct {
	ActivityId string `json:"activityId"`
	Arguments WorkItemArguments `json:"arguments"`
}

//TODO: Check if WorkSubmission and Work completed bodies have same fields
type WorkItemSubmissionResponse struct {
	Status string `json:"status"`
	Id string	`json:"id"`
	ReportUrl string `json:"reportUrl,omitempty"`
}

type WorkItemStats struct {
	TimeQueued string `json:"timeQueued"`
	TimeDownloadStarted string `json:"timeDownloadStarted,omitempty"`
	TimeInstructionsStarted string `json:"timeInstructionsStarted,omitempty"`
	TimeInstructionsEnded string `json:"timeInstructionsEnded,omitempty"`
	TimeUploadEnded string `json:"timeUploadEnded,omitempty"`
	BytesDownloaded uint64	`json:"bytesDownloaded,omitempty"`
	BytesUploaded uint64	`json:"bytesUploaded,omitempty"`
}

type ClientInform struct {
	TaskId uint64	`json:"task_id"`
	Type string 	`json:"type"`
	Status string	`json:"status"`
	Urls []string 	`json:"urls"`
}
