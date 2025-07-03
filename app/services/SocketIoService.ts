import server from "@adonisjs/core/services/server";
import { Server } from "socket.io";

 
class SocketIoService {
  // Your code here

  #booted = false;
  #socket: Server | null = null;

  boot() {
    if (this.#booted) return;
    /** Connect to AdonisTS */
    this.#socket = new Server(
      server.getNodeServer(),
      {
        cors: {
          origin: "*",
        },
      }
    )
    this.#booted = true;
    this.listen()
  }

  
  listen() {
    if (!this.#socket) return;

  }



}

export default new SocketIoService();

//