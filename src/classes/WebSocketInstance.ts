import { Server } from 'http';

import { Server as SocketInstance, Socket } from 'socket.io';

import { Replycable } from '../Replycable';
import { WebSocketDto } from '../interfaces';
import { WebSocketConnection } from './WebSocketConnection';

export class WebSocketInstance {
  private ws: SocketInstance;

  private activeConnection: WebSocketConnection[] = [];

  constructor(
    private server: Server,
    public db: Replycable
  ) {
    this.ws = new SocketInstance(this.server, {
      cors: {
        origin: "http://localhost:4200",
        methods: ["GET", "POST"]
      }
    });

    this.ws.on('connection', (socket: Socket) => {
      this.addActiveConnection(new WebSocketConnection(socket, this));
    });
  }


  public addActiveConnection(webSocketConnection: WebSocketConnection): void {
    this.activeConnection.push(webSocketConnection);
  }
  public deleteActiveConnection(webSocketConnection: WebSocketConnection): void {
    const index = this.activeConnection.indexOf(webSocketConnection);
    if (index !== -1) {
      this.activeConnection.splice(index, 1);
    }
  }
}