export interface JarvisStateEvent {
  mode: "idle" | "listening" | "thinking" | "speaking";
  handsFree: boolean;
  reply: string;
  transcript: string;
  online: boolean;
}

type JarvisStatePatch = Partial<JarvisStateEvent> & {
  isOnline?: boolean;
  queue?: unknown;
  queueStatus?: string;
  wakeActive?: boolean;
};

type SpeakFn  = (text: string) => Promise<void>;
type VoidFn   = () => void;
type BuildFn  = (description: string, platform: string) => Promise<string>;

const _r: {
  speak?:      SpeakFn;
  toggle?:     VoidFn;
  listen?:     VoidFn;
  stopAll?:    VoidFn;
  buildVoice?: BuildFn;
} = {};

export function registerJarvisSpeak(fn: SpeakFn)        { _r.speak      = fn; }
export function registerJarvisToggle(fn: VoidFn)        { _r.toggle     = fn; }
export function registerJarvisListen(fn: VoidFn)        { _r.listen     = fn; }
export function registerJarvisStopAll(fn: VoidFn)       { _r.stopAll    = fn; }
export function registerJarvisBuildVoice(fn: BuildFn)   { _r.buildVoice = fn; }

export function jarvisSpeak(text: string): Promise<void> {
  return _r.speak?.(text) ?? Promise.resolve();
}
export function jarvisToggle()      { _r.toggle?.();   }
export function jarvisListen()      { _r.listen?.();   }
export function jarvisStopAll()     { _r.stopAll?.();  }
export function jarvisBuildVoice(description: string, platform: string): Promise<string> {
  return _r.buildVoice?.(description, platform) ?? Promise.resolve("");
}

export function dispatchJarvisState(patch: JarvisStatePatch): void {
  const normalized: JarvisStateEvent = {
    mode: patch.mode ?? "idle",
    handsFree: patch.handsFree ?? false,
    reply: patch.reply ?? "",
    transcript: patch.transcript ?? "",
    online: patch.online ?? patch.isOnline ?? (typeof navigator !== "undefined" ? navigator.onLine : true),
  };
  window.dispatchEvent(new CustomEvent<JarvisStateEvent>("jarvis:state", { detail: normalized }));
}
