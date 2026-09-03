// FEAT-SAVE-WIDGET-FILE: the bits of the File System Access API we use that are not in the
// bundled lib.dom.d.ts. Optional everywhere - present in Chromium, absent in Firefox.

interface SaveFilePickerOptions {
  suggestedName?: string;
  types?: { description?: string; accept: Record<string, string[]> }[];
}

interface Window {
  showSaveFilePicker?(options?: SaveFilePickerOptions): Promise<FileSystemFileHandle>;
}

interface DataTransferItem {
  getAsFileSystemHandle?(): Promise<FileSystemHandle | null>;
}
