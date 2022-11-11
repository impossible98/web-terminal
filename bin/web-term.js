#!/usr/bin/env node

"use strict";
// Dependencies
const Lien = require("lien");
const WebTerm = require(__dirname + "/../lib");
const SocketIO = require("socket.io");
  , Logger = require("bug-killer")
  , Tilda = require("tilda")
  , Path = require("path")
  , isThere = require("is-there")
  , diable = require("diable")
  , open = require("opn")
  , abs = require("abs")
  ;

let parser = new Tilda(`${__dirname}/../package.json`, {
  examples: [
    "web-term # Default behavior"
    , "web-term -p 8080 # start on 0.0.0.0:8080"
    , "web-term -p 8080 -h localhost # start on localhost:8080"
    , "web-term -d # daemonize"
    , "web-term -c path/to/some/dir"
    , "web-term -o # Opens the web-term in the browser"
    , "web-term -s alsamixer # Opens alsamixer in the browser"
    , "web-term -C path/to/cert.pem -K path/to/key.pem # https support"
  ]
});

parser.option([
  {
    opts: ["p", "port"]
    , desc: "The web term server port."
    , name: "port"
    , type: Number
    , default: 7010
  }
  , {
    opts: ["H", "host"]
    , desc: "The host to listen to."
    , name: "host"
    , type: String
  }
  , {
    opts: ["d", "daemon"]
    , desc: "Start web term as background process."
  }
  , {
    opts: ["c", "cwd"]
    , desc: "The path to the web terminal current working directory."
    , name: "path"
  }
  , {
    opts: ["o", "open"]
    , desc: "If provided, the web term will be automatically opened in the default browser."
  }
  , {
    opts: ["b", "shell"]
    , desc: "The shell program. By default `bash`."
    , name: "program"
    , type: String
  }
  , {
    opts: ["s", "start"]
    , desc: "The start program."
    , name: "program"
    , type: String
  }
  , {
    opts: ["C", "cert"]
    , desc: "The path to the certificate file."
    , name: "path"
    , type: String
  }
  , {
    opts: ["K", "key"]
    , desc: "The path to the key file."
    , name: "path"
    , type: String
  }
  , {
    opts: ["P", "pty-options"]
    , desc: "Additional options to pass to the pty library."
    , name: "json"
    , type: String
  }
  , {
    opts: ["authentication-key"]
    , desc: "An optional authentication key."
    , type: String
  }
]).main(action => {

  // Daemonize the process
  if (!diable.isDaemon() && action.options.daemon.is_provided) {
    Logger.log("Starting as daemon.");
    diable();
    return;
  }

  let opts = action.options
    , cwdOpt = opts.cwd
    , certOpt = opts.cert
    , keyOpt = opts.key
    , hostOpt = opts.host
    , portOpt = opts.port
    , ptyOptsOpt = opts.P
    , openOpt = opts.open
    , startOpt = opts.start
    , shellOpt = opts.shell
    , authenticationKey = opts.authenticationKey
    ;

  // Validate the CWD
  if (cwdOpt.is_provided) {
    cwdOpt.value = Path.normalize(cwdOpt.value);
    if (!isThere(cwdOpt.value)) {
      Logger.log("The provided CWD doesn't exist. Using the default cwd.", "warn");
      cwdOpt.value = null;
    }
  }

  let ssl = {
    cert: certOpt.value
    , key: keyOpt.value
  };

  if (!ssl.cert && !ssl.key) {
    ssl = null;
  } else if (ssl.cert && !ssl.key || ssl.key && !ssl.cert) {
    Logger.log("If you want to enable https, pass both key and certificate paths.", "warn");
    ssl = null;
  } else {
    ssl.cert = abs(ssl.cert);
    ssl.key = abs(ssl.key);
  }

  // Init the server
  let app = new Lien({
    host: hostOpt.value
    , port: portOpt.value
    , public: __dirname + "/public"
    , ssl: ssl
    // TODO Enable this in the future
    //      Too lazy to set up templating right now
    , csrf: false
  });

  const checkAuth = query => {
    return authenticationKey.value && authenticationKey.value !== query.key;
  }

  app.before("*", (ctx, next) => {
    if (checkAuth(ctx.query)) {
      return ctx.end("Not authorized.");
    }
    next();
  });

  // Add the route
  app.addPage("/", "index.html");
  app.addPage("/vs", "vertical-split.html");
  app.addPage("/hs", "horizontal-split.html");

  // Themes options
  app.addPage("/themes", "Themes/index.html");
  app.addPage("/woo", "Themes/woo/index.html");
  app.addPage("/run", "Themes/woo/main.html");
  app.addPage("/doublerun", "Themes/woo/terminals.html");
  app.addPage("/settings", "settings.html");

  // Init Socket.IO
  app.io = SocketIO.listen(app.server, {
    log: false
  });

  app.addPage("/api/settings/save", function (lien) {
    if (!lien.data) { return; }
    WebTerm.writeSettings(lien.data, function (err, data) {
      if (err) {
        return lien.end(err, 400);
      }
      lien.end({});
    });
  });

  app.addPage("/api/settings/get", function (lien) {
    WebTerm.readSettings(function (err, data) {
      if (err) {
        return lien.end(err, 400);
      }
      lien.end(data);
    });
  });

  if (ptyOptsOpt.is_provided) {
    try {
      ptyOptsOpt.value = JSON.parse(ptyOptsOpt.value);
    } catch (e) {
      return Logger.log(new Error("Failed to parse the pty options. Make sure you pass valid data."));
    }
  }

  // Handle connections
  app.io.sockets.on("connection", function (socket) {
    if (checkAuth(socket.handshake.query)) {
      return socket.disconnect();
    }

    // One terminal per web-socket
    let req = socket.handshake
      , user = req.user
      , terminal = null
      ;

    socket.on("create", function (cols, rows, callback) {
      WebTerm.readSettings(function (err, settings) {
        terminal = new WebTerm({
          cols: cols
          , rows: rows
          , cwd: cwdOpt.value || process.cwd()
          , socket: socket
          , start: startOpt.value || settings.general.custom_command || undefined
          , shell: shellOpt.value || settings.general.shell
          , ptyOpts: ptyOptsOpt.value
        });
        callback();
      });
    });

    socket.on("dataToServer", function (data) {
      if (!terminal) { return; }
      terminal.data(data);
    });

    socket.on("kill", function () {
      if (!terminal) { return; }
      terminal.kill();
    });

    socket.on("resize", function (cols, rows) {
      if (!terminal) { return; }
      terminal.resize(cols, rows);
    });

    socket.on("disconnect", function () {
      if (!terminal) { return; }
      terminal.kill();
      terminal = null;
    });

    socket.on("requestReadSettings", WebTerm.sendTerminalSettings);
  });

  WebTerm._watchConfig();

  // Listen for the server load
  app.on("load", function (err) {
    let url = "http" + (ssl ? "s" : "") + "://" + (hostOpt.value || "localhost") + ":" + portOpt.value;
    if (err) {
      return Logger.log("Cannot start the server: " + err.toString(), "error");
    }
    Logger.log("Successfully started the Web-Term server.");
    Logger.log("App is running on " + url);
    Logger.log("For more themes options, go to: " + url + "/themes");
    Logger.log("For more settings, go to: " + url + "/settings");
    if (openOpt.is_provided) {
      open(url);
    }
  });
});
