declare module "gi://Gio" {
  export enum BusType {
    SYSTEM = 1,
    SESSION = 2,
  }

  export enum SubprocessFlags {
    STDOUT_PIPE = 4,
    STDERR_PIPE = 8,
  }

  export enum DBusProxyFlags {
    NONE = 0,
  }

  export enum DBusCallFlags {
    NONE = 0,
  }

  export enum ApplicationFlags {
    FLAGS_NONE = 0,
    IS_SERVICE = 1,
    HANDLES_OPEN = 4,
    HANDLES_COMMAND_LINE = 8,
    SEND_ENVIRONMENT = 16,
    NON_UNIQUE = 32,
  }

  export enum FileMonitorFlags {
    NONE = 0,
  }

  export enum FileCreateFlags {
    REPLACE_DESTINATION = 2,
  }

  export class Application {
    static get_default(): Application | null;
    connect(signal: string, callback: (...args: any[]) => any): number;
    disconnect(id: number): void;
    run(argv: string[] | null): number;
    quit(): void;
    hold(): void;
    release(): void;
  }

  export class File {
    static new_for_path(path: string): File;
    query_exists(cancellable: any): boolean;
    load_contents(cancellable: any): [boolean, Uint8Array | null];
    load_contents_async(cancellable: any, callback: (source: any, result: any) => void): void;
    load_contents_finish(result: any): [boolean, Uint8Array | null];
    replace_contents(
      contents: Uint8Array,
      etag: string | null,
      makeBackup: boolean,
      flags: FileCreateFlags,
      cancellable: any
    ): boolean;
    monitor_file(flags: FileMonitorFlags, cancellable: any): FileMonitor;
  }

  export class FileMonitor {
    connect(signal: string, callback: (...args: any[]) => any): number;
    disconnect(id: number): void;
  }

  export class Subprocess {
    static new(argv: string[], flags: number): Subprocess;
    communicate_utf8(input: string | null, cancellable: any): [boolean, string | null, string | null];
    communicate_utf8_async(
      input: string | null,
      cancellable: any,
      callback: (source: any, result: any) => void
    ): void;
    communicate_utf8_finish(result: any): [boolean, string | null, string | null];
    get_successful(): boolean;
  }

  export class DBusProxy {
    static new_for_bus_sync(
      busType: BusType,
      flags: DBusProxyFlags,
      info: any,
      name: string,
      objectPath: string,
      interfaceName: string,
      cancellable: any
    ): DBusProxy | null;

    call_sync(
      method: string,
      parameters: any,
      flags: DBusCallFlags,
      timeout: number,
      cancellable: any
    ): any;

    call(
      method: string,
      parameters: any,
      flags: DBusCallFlags,
      timeout: number,
      cancellable: any,
      callback: (source: any, result: any) => void
    ): void;

    call_finish(result: any): any;
    get_cached_property(property: string): import("gi://GLib").Variant | null;
    set_cached_property(property: string, value: import("gi://GLib").Variant | null): void;
    connect(signal: string, callback: (...args: any[]) => any): number;
    disconnect(id: number): void;
  }

  export class SocketClient {
    connect(address: SocketAddress, cancellable: any): SocketConnection;
  }

  export class SocketConnection {
    get_input_stream(): InputStream;
    get_output_stream(): OutputStream;
    close(cancellable: any): void;
  }

  export class SocketAddress {}

  export class UnixSocketAddress extends SocketAddress {
    static new(path: string): UnixSocketAddress;
  }

  export class InputStream {
    read_bytes(count: number, cancellable: any): any;
  }

  export class OutputStream {
    write_all(data: string | Uint8Array, cancellable: any): boolean;
    flush(cancellable: any): void;
  }

  export class DataInputStream {
    constructor(props: { base_stream: InputStream });
    read_line_utf8(cancellable: any): [string | null, number];
    read_line_async(
      priority: number,
      cancellable: any,
      callback: (source: any, result: any) => void
    ): void;
    read_line_finish_utf8(result: any): [string | null, number];
  }
}
