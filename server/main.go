package main

import (
	"embed"
	"fmt"
	"io/fs"
	"log"
	"net"
	"os"
	"os/exec"
	"runtime"
	"strings"
	"time"

	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/plugins/migratecmd"

	_ "rpg-assistant/migrations"
)

//go:embed all:dist
var distFS embed.FS

func main() {
	app := pocketbase.New()

	// double-clicking the executable (no arguments) starts the server
	launchedByDoubleClick := len(os.Args) == 1
	if launchedByDoubleClick {
		os.Args = append(os.Args, "serve", "--http=0.0.0.0:8090")
	}

	// generate migration files automatically only while developing with `go run`
	isGoRun := strings.HasPrefix(os.Args[0], os.TempDir())
	migratecmd.MustRegister(app, app.RootCmd, migratecmd.Config{
		Dir:          "migrations",
		TemplateLang: migratecmd.TemplateLangGo,
		Automigrate:  isGoRun,
	})

	app.OnServe().BindFunc(func(se *core.ServeEvent) error {
		// server clock for the music sync (replaces pb_hooks/time.pb.js)
		se.Router.GET("/api/time", func(e *core.RequestEvent) error {
			return e.JSON(200, map[string]int64{"now": time.Now().UnixMilli()})
		})

		// the web app, embedded in the executable
		site, err := fs.Sub(distFS, "dist")
		if err != nil {
			return err
		}
		se.Router.GET("/{path...}", apis.Static(site, false))

		printAddresses(se.Server.Addr)
		if launchedByDoubleClick {
			go func() {
				time.Sleep(time.Second)
				openBrowser("http://127.0.0.1:" + portOf(se.Server.Addr))
			}()
		}
		return se.Next()
	})

	if err := app.Start(); err != nil {
		log.Fatal(err)
	}
}

func portOf(addr string) string {
	_, port, err := net.SplitHostPort(addr)
	if err != nil {
		return "8090"
	}
	return port
}

// prints every address players can use (LAN and VPN such as Tailscale)
func printAddresses(addr string) {
	port := portOf(addr)
	fmt.Println("\n  RPG Assistant is running. Players can open:")
	addrs, _ := net.InterfaceAddrs()
	for _, a := range addrs {
		if ipnet, ok := a.(*net.IPNet); ok && !ipnet.IP.IsLoopback() && ipnet.IP.To4() != nil {
			fmt.Printf("    http://%s:%s\n", ipnet.IP, port)
		}
	}
	fmt.Printf("  DM admin panel: http://127.0.0.1:%s/_/\n\n", port)
}

func openBrowser(url string) {
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "windows":
		cmd = exec.Command("rundll32", "url.dll,FileProtocolHandler", url)
	case "darwin":
		cmd = exec.Command("open", url)
	default:
		cmd = exec.Command("xdg-open", url)
	}
	_ = cmd.Start()
}
