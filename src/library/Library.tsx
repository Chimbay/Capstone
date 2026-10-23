import { DocumentAPI } from '@api/document'
import type { TreeNode } from '@api/types'
import { allSaved } from '@board/saver'
import { useLocation, useNavigate } from '@solidjs/router'
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

  const navigate = useNavigate()
  const route = useLocation()

  async function remove(node: TreeNode): Promise<void> {
    // Deleting the board on screen (the sidebar shows on board pages): leave it first, so the
    // page doesn't keep saving to a file that's gone, and let its last save land before the delete.
    if (node.uuid && route.pathname === `/board/${node.uuid}`) {
      navigate('/')
      // One tick for the router to unmount the board, which registers its final save.
      await new Promise(resolve => setTimeout(resolve))
      await allSaved()
    }
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
      <div class="flex items-center gap-2 text-xs text-gray-500 dark:text-zinc-400">
        <span class="min-w-0 truncate" title={location() ?? ''}>
          {location()}
        </span>
        <button
          class="btn-ghost shrink-0 px-1 text-blue-600 dark:text-indigo-400"
          onClick={() => void library.choose()}
        >
          Change
        </button>
      </div>
      <Show when={library.error()}>
        <p class="text-xs text-red-600 dark:text-red-400">{library.error()}</p>
      </Show>
      <hr class="m-1 dark:border-zinc-700" />
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
              class="cursor-pointer rounded-md px-2 py-1 text-sm text-gray-500 hover:bg-gray-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              classList={{ 'bg-gray-200 dark:bg-indigo-900/40': folder() === '' }}
              onClick={() => setFolder('')}
            >
              Library{folder() && ` / ${folder()}`}
            </div>
            <Tree
              nodes={nodes()}
              selected={folder()}
              isOpen={path => open().has(path)}
              onSelectFolder={selectFolder}
              onDelete={node => void remove(node)}
            />
          </DropBox>
        )}
      </Show>
    </div>
  )
}
