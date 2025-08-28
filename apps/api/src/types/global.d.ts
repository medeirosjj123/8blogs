import { Server } from 'socket.io';

declare global {
  var socketIO: Server | undefined;
}

export {};