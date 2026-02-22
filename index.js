import http from "node:http";
import fs from "fs";
import path from "path";
import { WebSocketServer } from "ws";
import pty from "node-pty";

function getShell() {
  if (process.platform === "win32") return "cmd.exe";
  if (process.platform === "darwin") return "zsh";
  return "bash";
}

const server = http.createServer((req, res) => {
  // Serve index.html for root
  if (req.url === "/" || req.url === "/index.html") {
    const file = path.join(process.cwd(), "index.html");
    fs.readFile(file, (err, data) => {
      if (err) {
        res.writeHead(500);
        res.end("Error loading file");
        return;
      }
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(data);
    });
  } else {
    res.writeHead(404);
    res.end("Not found");
  }
});
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
