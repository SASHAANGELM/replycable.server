import { BehaviorSubject } from "rxjs";
import { Socket } from "socket.io";
import { WebSocketRequest, WebSocketResponse } from "../interfaces";
import { WebSocketInstance } from "./WebSocketInstance";

export class WebSocketConnection {
  public auth: any;

  public sync$: BehaviorSubject<boolean> = new BehaviorSubject(false);
  public get sync(): boolean {
    return this.sync$.getValue();
  }

  constructor(
    public socket: Socket,
    public ws: WebSocketInstance
  ) {
    console.log('WebSocketConnection connected');

    socket.on("disconnect", (reason) => {
      console.log('WebSocketConnection disconnect');
      this.ws.deleteActiveConnection(this);
    });

    socket.on('PING_PONG', (data) => {
      socket.emit('PING_PONG', {
        client: data,
        server: Date.now()
      });
    });

    socket.on('SET_AUTH', async (request: WebSocketRequest) => {
      const { id, payload } = request;
      if (typeof this.ws.db.auth?.setAuth === 'function') {
        this.auth = await this.ws.db.auth.setAuth(payload);
        this.socket.emit('SET_AUTH', { id, payload: this.auth });
      } else {
        this.auth = payload;
        this.socket.emit('SET_AUTH', { id, payload: this.auth });
      }
      // console.log('SET_AUTH', this.auth)
    })

    socket.on('SYNC', async (request: WebSocketRequest) => {
      if (this.sync) {
        const sub = this.sync$.subscribe((sync) => {
          if (!sync) {
            this.syncHandler(request);
            sub.unsubscribe();
          }
        })
      } else {
        this.syncHandler(request);
      }
    });

    socket.on('QUERY', async (request: WebSocketRequest) => {
      if (this.sync) {
        const sub = this.sync$.subscribe((sync) => {
          if (!sync) {
            this.queryHandler(request);
            sub.unsubscribe();
          }
        })
      } else {
        this.queryHandler(request);
      }
    });
  }

  public async syncHandler(request: WebSocketRequest) {
    const { id, payload } = request;
    this.sync$.next(true);
    const changesResult = await this.ws.db.startSyncProcess(payload, this.auth);
    console.log('changesResult', changesResult);
    this.sync$.next(false);
    this.socket.emit('SYNC_RESULT', { id, payload: changesResult });
  }

  async queryHandler(request) {
    const { id, payload } = request;
    const [ collection, documentId ] = payload.path.split('/');
    let result;
    if (documentId == null) {
      result = await this.ws.db.list(collection);
      console.log(`list(${collection})`, result)
    } else {
      result = await this.ws.db.get(collection, documentId);
      console.log(`get(${collection}, ${documentId})`, result)
    }
    this.socket.emit('QUERY', { id, result });
  }
}