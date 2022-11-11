## Documentation

You can see below the API reference of this module.

### `WebTerm(options)`
Creates a new `WebTerm` instance.

#### Params

- **Object** `options`: Creates a new terminal instance:
 - `cols` (Number): The number of columns.
 - `rows` (Number): The number of rows.
 - `cwd` (String): The current working directory (default: the home directory).
 - `shell` (String): The shell to start (by default the shell).
 - `start` (String): The start program.
 - `ptyOptions` (Object): Custom options for the pty.js fork call
 - `inheritEnv` (Boolean): If `false`, it will prevent web-term to take the environment variables from the main process.

#### Return
- **Terminal** The terminal instance.
- **WebTerm** The `WebTerm` instance.

### `sendTerminalSettings(callback)`
Sends the terminal settings accross the sockets.

#### Params

- **Function** `callback`: The callback function.

### `_watchConfig()`
Watches the config file for changes.

### `readSettings(callback)`
Reads the settings from the config file.

#### Params

- **Function** `callback`: The callback function.

### `writeSettings(data, callback)`
Writes the settings in the config file.

#### Params

- **Object** `data`: The new settings.
- **Function** `callback`: The callback function.

### `data(data)`
Writes data in the `WebTerm` instance.

#### Params

- **Buffer** `data`: The buffer to write.

### `kill()`
Destroys the `WebTerm` instance.

### `resize(cols, rows)`
Resizes the terminal.

#### Params

- **Number** `cols`: The number of columns.
- **Number** `rows`: The number of rows.

