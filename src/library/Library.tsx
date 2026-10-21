import { DocumentAPI } from '@api/document'
import type { TreeNode } from '@api/types'
import { useToast } from '@ui/toast/ToastContext'
import { createResource, createSignal, Show } from 'solid-js'
import { useChooseLibrary } from './ChooseLibrary'
import CreateFile from './CreateFile'
import DropBox from './DropBox'
import Tree from './Tree'

export default function Library() {
  const { error } = useToast()
  const [location] = createResource(() => DocumentAPI.library_location())
  const library = useChooseLibrary()
  // Folder that new notes, folders and dropped files go into; '' is the library root.
  const [folder, setFolder] = createSignal('')
  const [open, setOpen] = createSignal(new Set<string>())

  const [tree, { refetch }] = createResource(async () => {
    try {
      return await DocumentAPI.library_tree()
    } catch (err) {
      error(err as string) // Rust errors serialize to plain strings
      throw err
    }
  })

  // Runs a change on disk, reports failures, then rescans so the tree matches the folder.
  async function change(action: Promise<void>): Promise<void> {
    try {
      await action
    } catch (err) {
      error(err as string)
    }
    void refetch()
  }

  function selectFolder(path: string): void {
    const next = new Set(open())
    // Clicking the already-selected folder collapses it; any other click selects and expands.
    if (folder() === path && next.has(path)) next.delete(path)
    else next.add(path)
    setOpen(next)
    setFolder(path)
  }

  function remove(node: TreeNode): void {
    if (node.uuid) void change(DocumentAPI.delete_file(node.uuid))
    else {
      if (folder() === node.path) setFolder('')
      void change(DocumentAPI.delete_folder(node.path))
    }
  }

  return (
    <div class="flex min-w-0 flex-col">
      <div class="flex w-full items-center justify-between">
        <h3>Your documents</h3>
      </div>
      <div class="flex items-center gap-2 text-xs text-gray-500">
        <span class="min-w-0 truncate" title={location() ?? ''}>
          {location()}
        </span>
        <button
          class="btn-ghost shrink-0 px-1 text-blue-600"
          onClick={() => void library.choose()}
        >
          Change
        </button>
      </div>
      <Show when={library.error()}>
        <p class="text-xs text-red-600">{library.error()}</p>
      </Show>
      <hr class="m-1" />
      <div class="mb-2 flex flex-wrap gap-2">
        <CreateFile
          label="New note"
          onCreate={title => void change(DocumentAPI.create_new_file(folder(), title))}
        />
        <CreateFile
          label="New board"
          onCreate={title => void change(DocumentAPI.create_board(folder(), title))}
        />
        <CreateFile
          label="New folder"
          onCreate={name => void change(DocumentAPI.create_folder(folder(), name))}
        />
      </div>
      <Show when={tree()} fallback={<>Loading...</>}>
        {nodes => (
          <DropBox
            onDrop={files => void change(DocumentAPI.file_upload(files, folder()))}
          >
            <div
              class="cursor-pointer rounded-md px-2 py-1 text-sm text-gray-500 hover:bg-gray-100"
              classList={{ 'bg-gray-200': folder() === '' }}
              onClick={() => setFolder('')}
            >
              Library{folder() && ` / ${folder()}`}
            </div>
            <Tree
              nodes={nodes()}
              selected={folder()}
              isOpen={path => open().has(path)}
              onSelectFolder={selectFolder}
              onDelete={remove}
            />
          </DropBox>
        )}
      </Show>
    </div>
  )
}
