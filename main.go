package main

import (
	"github.com/apprentice3d/DA4Max_Panorama/server"
	"github.com/apprentice3d/forge-api-go-client/oauth"
	"log"
	"net/http"
	"os"
)

func main() {

	service := server.ForgeServices{
		Oauth: setupForgeOAuth(),
	}

	//serving static files
	fs := http.FileServer(http.Dir("www"))
	http.Handle("/", fs)

	// routes
	http.HandleFunc("/gettoken", service.GetToken)
	http.HandleFunc("/ws", service.WsEndpoint)
	http.HandleFunc("/report", service.DAResults)

	/* //starting server with random port //
	listener, err := net.Listen("tcp", ":0")
	if err != nil {
		log.Fatal("Could not get a port: ", err)
	}


	log.Printf("Serving on port %d\n\n ", listener.Addr().(*net.TCPAddr).Port)
	if err := http.Serve(listener, nil); err != nil {
		log.Fatalln(err.Error())
	}
	    // end starting server with random port
	*/

	// starting server on port 8080
	if err := http.ListenAndServe(":8080", nil); err != nil {
		log.Fatalln(err.Error())
	}
}

func setupForgeOAuth() oauth.TwoLeggedAuth {
	clientID := os.Getenv("FORGE_CLIENT_ID")
	clientSecret := os.Getenv("FORGE_CLIENT_SECRET")

	if len(clientID) == 0 || len(clientSecret) == 0 {
		log.Fatal("The FORGE_CLIENT_ID and FORGE_CLIENT_SECRET env vars are not set. \nExiting ...")
	}

	log.Printf("Starting app with FORGE_CLIENT_ID = %s\n", clientID)
	return oauth.NewTwoLeggedClient(clientID, clientSecret)
}
