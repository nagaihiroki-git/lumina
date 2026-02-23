declare module "gi://GLib" {
  export const PRIORITY_DEFAULT: number;
  export const SOURCE_CONTINUE: boolean;
  export const SOURCE_REMOVE: boolean;

  export function timeout_add(priority: number, interval: number, callback: () => boolean): number;
  export function source_remove(id: number): boolean;
  export function getenv(name: string): string | null;
  export function get_home_dir(): string;
  export function get_user_runtime_dir(): string;
  export function mkdir_with_parents(path: string, mode: number): number;

  export class Variant {
    constructor(format: string, value: any[]);
    recursiveUnpack(): any;
    deep_unpack(): any;
    unpack(): any;
  }
}
