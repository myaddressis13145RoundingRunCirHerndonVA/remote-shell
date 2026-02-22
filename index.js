import http from "node:http";
import { WebSocketServer } from "ws";
import pty from "node-pty";

function getShell() {
  if (process.platform === "win32") return "cmd.exe";
  if (process.platform === "darwin") return "zsh";
  return "bash";
}

const server = http.createServer();
const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {

  const shell = pty.spawn(getShell(), [], {
    name: "xterm-color",
    cols: 80,
    rows: 30,
    cwd: process.cwd(),
    env: process.env
  });

  shell.onData(data => {
    ws.send(data);
  });

  ws.on("message", (msg) => {
    const text = msg.toString();

    // resize support
    if (text.startsWith("RESIZE:")) {
      const size = JSON.parse(text.slice(7));
      shell.resize(size.cols, size.rows);
      return;
    }

    shell.write(text);
  });

  ws.on("close", () => {
    shell.kill();
  });

});

server.listen(8080, "127.0.0.1", () => {
  console.log("Terminal ready on http://127.0.0.1:8080");
});
