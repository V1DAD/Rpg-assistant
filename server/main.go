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
	"sync/atomic"
	"time"

	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/plugins/migratecmd"
	"golang.org/x/term"

	_ "rpg-assistant/migrations"
)

//go:embed all:dist
var distFS embed.FS

var installerShown atomic.Bool

func main() {
	app := pocketbase.New()

	// double-clicking the executable (no arguments) starts the server
	launchedByDoubleClick := len(os.Args) == 1
	if launchedByDoubleClick {
		ensureTerminal() // Linux/macOS: reopen inside a terminal so the admin link is visible
		os.Args = append(os.Args, "serve", "--http=0.0.0.0:8090")
	}

	// the desktop shell sets this: it shows pages itself, so never open the system browser
	noBrowser := os.Getenv("RPG_NO_BROWSER") != ""

	// generate migration files automatically only while developing with `go run`
	isGoRun := strings.HasPrefix(os.Args[0], os.TempDir())
	migratecmd.MustRegister(app, app.RootCmd, migratecmd.Config{
		Dir:          "migrations",
		TemplateLang: migratecmd.TemplateLangGo,
		Automigrate:  isGoRun,
	})

	app.OnServe().BindFunc(func(se *core.ServeEvent) error {
		// server clock for the music sync
		se.Router.GET("/api/time", func(e *core.RequestEvent) error {
			return e.JSON(200, map[string]int64{"now": time.Now().UnixMilli()})
		})

		// the web app, embedded in the executable
		site, err := fs.Sub(distFS, "dist")
		if err != nil {
			return err
		}
		se.Router.GET("/{path...}", apis.Static(site, false))

		// first run (no admin account yet): show the "create admin account" link
		se.InstallerFunc = func(app core.App, su *core.Record, baseURL string) error {
			installerShown.Store(true)
			if !noBrowser {
				// PocketBase's own behavior: prints the link and opens the browser
				return apis.DefaultInstallerFunc(app, su, baseURL)
			}
			// desktop shell: just print the link, the shell reads it and shows it in its window
			token, err := su.NewStaticAuthToken(30 * time.Minute)
			if err != nil {
				return err
			}
			base := strings.NewReplacer("0.0.0.0", "127.0.0.1", "[::]", "127.0.0.1").Replace(baseURL)
			fmt.Println("\n  FIRST RUN: create your admin account here (valid for 30 minutes):")
			fmt.Println("  " + base + "/_/#/pbinstal/" + token + "\n")
			return nil
		}

		printAddresses(se.Server.Addr)

		if launchedByDoubleClick && !noBrowser {
			go func() {
				time.Sleep(1500 * time.Millisecond)
				if !installerShown.Load() { // an account already exists: open the app
					openBrowser("http://127.0.0.1:" + portOf(se.Server.Addr))
				}
			}()
		}
		return se.Next()
	})

	if err := app.Start(); err != nil {
		log.Fatal(err)
	}
}

// Linux/macOS: a double-clicked executable has no terminal, so start a terminal running it
func ensureTerminal() {
	if runtime.GOOS == "windows" || os.Getenv("RPG_IN_TERMINAL") != "" {
		return
	}
	if term.IsTerminal(int(os.Stdout.Fd())) {
		return // already running in a terminal
	}
	self, err := os.Executable()
	if err != nil {
		return
	}

	var cmd *exec.Cmd
	if runtime.GOOS == "darwin" {
		cmd = exec.Command("open", "-a", "Terminal", self)
	} else {
		candidates := [][]string{
			{"gnome-terminal", "--"},
			{"ptyxis", "--"},
			{"konsole", "-e"},
			{"xfce4-terminal", "-e"},
			{"x-terminal-emulator", "-e"},
			{"xterm", "-e"},
		}
		for _, c := range candidates {
			if p, err := exec.LookPath(c[0]); err == nil {
				cmd = exec.Command(p, append(c[1:], self)...)
				break
			}
		}
	}
	if cmd == nil {
		return // no terminal found: keep running here, the browser fallback still works
	}
	cmd.Env = append(os.Environ(), "RPG_IN_TERMINAL=1")
	if cmd.Start() == nil {
		os.Exit(0)
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
