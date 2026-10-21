use crate::error::LibraryError;
use crate::models::TreeNode;
use serde_json::Value;
use std::collections::HashSet;
use std::fs;
use std::path::{Component, Path, PathBuf};
use uuid::Uuid;

// Joins a frontend-supplied relative path onto the root, rejecting anything that could escape it.
pub fn resolve(root: &Path, rel: &str) -> Result<PathBuf, LibraryError> {
    let rel_path = Path::new(rel);
    if rel_path.components().all(|c| matches!(c, Component::Normal(_))) {
        Ok(root.join(rel_path))
    } else {
        Err(LibraryError::BadRequest("invalid path"))
    }
}

// A single file or folder name. Dot-names are rejected because the scan skips them.
pub fn check_name(name: &str) -> Result<(), LibraryError> {
    if name.is_empty() || name.starts_with('.') || name.contains(['/', '\\']) {
        return Err(LibraryError::BadRequest("invalid name"));
    }
    Ok(())
}

// The `uuid:` value from a leading `---` front-matter block.
pub fn header_uuid(content: &str) -> Option<&str> {
    let mut lines = content.lines();
    if lines.next()?.trim_end() != "---" {
        return None;
    }
    for line in lines {
        let line = line.trim();
        if line == "---" {
            break;
        }
        if let Some(value) = line.strip_prefix("uuid:") {
            return Some(value.trim());
        }
    }
    None
}

// Content with its front-matter uuid set to `uuid`, keeping any other header keys.
pub fn with_uuid(content: &str, uuid: &str) -> String {
    let mut lines = content.split_inclusive('\n');
    match lines.next() {
        Some(first) if first.trim_end() == "---" => {
            let mut out = format!("{first}uuid: {uuid}\n");
            for line in lines.by_ref() {
                if line.trim_end() == "---" {
                    out.push_str(line);
                    break;
                }
                if !line.trim_start().starts_with("uuid:") {
                    out.push_str(line);
                }
            }
            out.extend(lines);
            out
        }
        _ => format!("---\nuuid: {uuid}\n---\n{content}"),
    }
}

// Walks the library, writes a fresh uuid into notes (front matter) and boards (`uuid` key)
// that lack one or share a copied one, and returns the tree plus the (uuid, path) index rows.
// shortcut: reads every note on each scan; track mtimes to skip unchanged files once libraries get large.
pub fn scan(root: &Path) -> Result<(Vec<TreeNode>, Vec<(String, String)>), LibraryError> {
    let mut seen = HashSet::new();
    let mut index = Vec::new();
    let tree = scan_dir(root, "", &mut seen, &mut index)?;
    Ok((tree, index))
}

fn scan_dir(
    dir: &Path,
    rel: &str,
    seen: &mut HashSet<String>,
    index: &mut Vec<(String, String)>,
) -> Result<Vec<TreeNode>, LibraryError> {
    let mut entries = fs::read_dir(dir)?.collect::<Result<Vec<_>, _>>()?;
    entries.sort_by_key(|e| e.file_name());

    let mut folders = Vec::new();
    let mut notes = Vec::new();
    for entry in entries {
        let name = entry.file_name().to_string_lossy().into_owned();
        if name.starts_with('.') {
            continue;
        }
        let path = if rel.is_empty() { name.clone() } else { format!("{rel}/{name}") };

        if entry.file_type()?.is_dir() {
            let children = scan_dir(&entry.path(), &path, seen, index)?;
            folders.push(TreeNode { name, path, uuid: None, children: Some(children) });
        } else if let Some((stem, is_board)) = name
            .strip_suffix(".board.json")
            .map(|s| (s, true))
            .or_else(|| name.strip_suffix(".md").map(|s| (s, false)))
        {
            // One unreadable (locked, non-UTF-8) file shouldn't hide the whole library.
            let Ok(content) = fs::read_to_string(entry.path()) else {
                continue;
            };
            let mut board = None;
            let existing = if is_board {
                // Broken JSON is skipped, never rewritten, so a half-saved board can't be clobbered.
                let Ok(Value::Object(obj)) = serde_json::from_str::<Value>(&content) else {
                    continue;
                };
                let u = obj.get("uuid").and_then(Value::as_str).map(str::to_string);
                board = Some(obj);
                u
            } else {
                header_uuid(&content).map(str::to_string)
            };
            let uuid = match existing {
                Some(u) if !u.is_empty() && !seen.contains(&u) => u,
                _ => {
                    let u = Uuid::new_v4().to_string();
                    let updated = match board {
                        Some(mut obj) => {
                            obj.insert("uuid".into(), Value::from(u.clone()));
                            serde_json::to_string_pretty(&obj)?
                        }
                        None => with_uuid(&content, &u),
                    };
                    fs::write(entry.path(), updated)?;
                    u
                }
            };
            seen.insert(uuid.clone());
            index.push((uuid.clone(), path.clone()));
            notes.push(TreeNode {
                name: stem.to_string(),
                path,
                uuid: Some(uuid),
                children: None,
            });
        }
    }
    folders.extend(notes);
    Ok(folders)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reads_header_uuid() {
        assert_eq!(header_uuid("---\nuuid: a\n---\nbody"), Some("a"));
        assert_eq!(header_uuid("---\r\ntitle: x\r\nuuid: b\r\n---\r\n"), Some("b"));
        // Capstone-era header: no space, junk after the closing line.
        assert_eq!(header_uuid("---\nuuid:c\n---, \n text"), Some("c"));
        assert_eq!(header_uuid("# just a note\nuuid: d"), None);
        assert_eq!(header_uuid("---\ntitle: x\n---\nuuid: e"), None);
    }

    #[test]
    fn writes_header_uuid() {
        assert_eq!(with_uuid("hello", "u"), "---\nuuid: u\n---\nhello");
        assert_eq!(
            with_uuid("---\ntitle: x\nuuid: old\n---\nbody\nuuid: keep", "new"),
            "---\nuuid: new\ntitle: x\n---\nbody\nuuid: keep"
        );
        assert_eq!(header_uuid(&with_uuid("---\ntitle: x\n---\n", "z")), Some("z"));
    }

    #[test]
    fn scan_assigns_unique_ids_to_notes_and_boards() {
        let root = std::env::temp_dir().join(format!("whiteboard-scan-{}", Uuid::new_v4()));
        fs::create_dir_all(root.join("sub")).unwrap();
        fs::write(root.join("plain.md"), "no header").unwrap();
        fs::write(root.join("sub/copy.md"), "---
uuid: same
---
").unwrap();
        fs::write(root.join("sub/orig.md"), "---
uuid: same
---
").unwrap();
        fs::write(root.join("a.board.json"), r#"{"nodes":[],"edges":[]}"#).unwrap();
        fs::write(root.join("b.board.json"), r#"{"uuid":"same","nodes":[]}"#).unwrap();
        fs::write(root.join("broken.board.json"), "{not json").unwrap();
        fs::write(root.join("other.txt"), "ignored").unwrap();

        let (tree, index) = scan(&root).unwrap();
        let ids: HashSet<_> = index.iter().map(|(u, _)| u.clone()).collect();
        assert_eq!(index.len(), 5, "broken board and .txt are skipped: {index:?}");
        assert_eq!(ids.len(), 5, "every id is unique");
        // Folder first, then files by name; board names drop the double extension.
        let names: Vec<_> = tree.iter().map(|n| n.name.as_str()).collect();
        assert_eq!(names, ["sub", "a", "b", "plain"]);
        // Fixes were written back, and the broken board was left untouched.
        let board: Value = serde_json::from_str(&fs::read_to_string(root.join("a.board.json")).unwrap()).unwrap();
        assert!(ids.contains(board["uuid"].as_str().unwrap()));
        assert_eq!(board["nodes"], Value::Array(vec![]));
        assert!(header_uuid(&fs::read_to_string(root.join("plain.md")).unwrap()).is_some());
        assert_eq!(fs::read_to_string(root.join("broken.board.json")).unwrap(), "{not json");
        // A second scan changes nothing.
        let (_, again) = scan(&root).unwrap();
        assert_eq!(again, index);
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn resolve_stays_inside_root() {
        let root = Path::new("root");
        assert_eq!(resolve(root, "").unwrap(), root);
        assert_eq!(resolve(root, "a/b").unwrap(), root.join("a/b"));
        assert!(resolve(root, "../x").is_err());
        assert!(resolve(root, "a/../../x").is_err());
        assert!(resolve(root, "/x").is_err());
        #[cfg(windows)]
        assert!(resolve(root, "C:\\x").is_err());
    }
}
