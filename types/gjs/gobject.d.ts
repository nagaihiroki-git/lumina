declare module "gi://GObject" {
  export interface GObjectClass {
    GTypeName?: string;
  }

  export function registerClass<T extends new (...args: any[]) => any>(
    config: GObjectClass,
    klass: T
  ): T;

  export class Object {
    connect(signal: string, callback: (...args: any[]) => any): number;
    disconnect(id: number): void;
    emit(signal: string, ...args: any[]): void;
  }
}
