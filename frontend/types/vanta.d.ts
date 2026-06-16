declare module "vanta/dist/vanta.net.min" {
  import type * as THREE from "three";
  interface VantaOptions {
    el: HTMLElement;
    THREE: typeof THREE;
    [key: string]: unknown;
  }
  function NET(opts: VantaOptions): { destroy: () => void };
  export default NET;
}
