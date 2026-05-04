export interface JarvisStateEvent {
  mode: "idle" | "listening" | "thinking" | "speaking";
  handsFree: boolean;
  reply: string;
  transcript: string;
  online: boolean;
}

type SpeakFn  = (text: string) => Promise<void>;
type VoidFn   = () => void;

const _r: {
  speak?:   SpeakFn;
  toggle?:  VoidFn;
  listen?:  VoidFn;
  stopAll?: VoidFn;
} = {};

export function registerJarvisSpeak(fn: SpeakFn)  { _r.speak   = fn; }
export function registerJarvisToggle(fn: VoidFn)  { _r.toggle  = fn; }
export function registerJarvisListen(fn: VoidFn)  { _r.listen  = fn; }
export function registerJarvisStopAll(fn: VoidFn) { _r.stopAll = fn; }

export function jarvisSpeak(text: string): Promise<void> {
  return _r.speak?.(text) ?? Promise.resolve();
}
export function jarvisToggle()  { _r.toggle?.();  }
export function jarvisListen()  { _r.listen?.();  }
export function jarvisStopAll() { _r.stopAll?.(); }

export function dispatchJarvisState(state: JarvisStateEvent): void {
  window.dispatchEvent(new CustomEvent<JarvisStateEvent>("jarvis:state", { detail: state }));
}
