interface SerialPort {
  readonly readable: ReadableStream;
  readonly writable: WritableStream;
  open({baudRate: number}): Promise<void>;
  close(): Promise<void>;
}

interface NavigatorSerial {
  requestPort(): Promise<SerialPort>;
}

interface Navigator {
  serial?: NavigatorSerial;
}

interface ReadableStream {
  releaseLock?(): void;
}

interface WritableStream {
  releaseLock?(): void;
}

