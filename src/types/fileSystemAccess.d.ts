// Compléments d'ambiant pour la File System Access API : lib.dom.d.ts fournit déjà
// FileSystemHandle/FileSystemDirectoryHandle/FileSystemFileHandle (lecture, écriture,
// itération), mais pas showDirectoryPicker() ni les permissions — ces deux morceaux
// sont encore absents du lib DOM standard de TypeScript.

type WellKnownDirectory = 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos';

interface DirectoryPickerOptions {
  id?: string;
  mode?: 'read' | 'readwrite';
  startIn?: FileSystemHandle | WellKnownDirectory;
}

interface FileSystemHandlePermissionDescriptor {
  mode?: 'read' | 'readwrite';
}

interface FileSystemHandle {
  queryPermission(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>;
  requestPermission(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>;
}

interface Window {
  showDirectoryPicker(options?: DirectoryPickerOptions): Promise<FileSystemDirectoryHandle>;
}
