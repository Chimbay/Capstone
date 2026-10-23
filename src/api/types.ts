// A folder (children set) or a note (uuid set). path is relative to the library root.
export interface TreeNode {
  name: string
  path: string
  uuid: string | null
  children: TreeNode[] | null
  // Set for a note or board the scan couldn't use (unreadable, invalid JSON); it can't be opened.
  error: string | null
}

// A note or board's current name (from its file name) and contents.
export interface FileInfo {
  name: string
  content: string
}
