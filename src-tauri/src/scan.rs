use crate::error::LibraryError;
use crate::models::TreeNode;
use serde_json::Value;
use std::collections::{HashMap, HashSet};
use std::fs::{self, File};
use std::io::{self, Write};
use std::path::{Component, Path, PathBuf};
use uuid::Uuid;

// Joins a frontend-supplied relative path onto the root, rejecting anything that could escape it.
pub fn resolve(root: &Path, rel: &str) -> Result<PathBuf, LibraryError> {
    let rel_path = Path::new(rel);
    if rel_path
        .components()
        .all(|c| matches!(c, Component::Normal(_)))
    {
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

// Splits `content` into (BOM, front matter, body). Front matter runs from a leading `---` line
// through the next `---` line; without a closing line, a leading `---` is just a horizontal rule.
// The closing line only has to start with `---`: Capstone-era headers have junk after it.
fn split_front_matter(content: &str) -> (&str, Option<&str>, &str) {
    // Windows editors may save a BOM, which would hide the opening `---`.
    let (bom, text) = match content.strip_prefix('\u{FEFF}') {
        Some(rest) => ("\u{FEFF}", rest),
        None => ("", content),
    };
    let mut lines = text.split_inclusive('\n');
    if let Some(first) = lines.next().filter(|l| l.trim_end() == "---") {
        let mut end = first.len();
        for line in lines {
            end += line.len();
            if line.trim().starts_with("---") {
                return (bom, Some(&text[..end]), &text[end..]);
            }
        }
    }
    (bom, None, text)
}

// The `uuid:` value from a leading `---` front-matter block.
pub fn header_uuid(content: &str) -> Option<&str> {
    let (_, header, _) = split_front_matter(content);
    header?
        .lines()
        .skip(1)
        .find_map(|l| l.trim().strip_prefix("uuid:"))
        .map(str::trim)
}

// Content with its front-matter uuid set to `uuid`, keeping any other header keys and the body.
// A BOM stays first, so the file keeps the encoding signature its editor chose.
pub fn with_uuid(content: &str, uuid: &str) -> String {
    match split_front_matter(content) {
        (bom, Some(header), body) => {
            let mut lines = header.split_inclusive('\n');
            let first = lines.next().unwrap_or_default();
            let mut out = format!("{bom}{first}uuid: {uuid}\n");
            out.extend(lines.filter(|l| !l.trim_start().starts_with("uuid:")));
            out.push_str(body);
            out
        }
        (bom, None, body) => format!("{bom}---\nuuid: {uuid}\n---\n{body}"),
    }
}

// The uuid a note (front matter) or board (`uuid` key) carries on disk, if any.
pub fn file_uuid(path: &Path) -> Option<String> {
    let content = fs::read_to_string(path).ok()?;
    if path.to_string_lossy().ends_with(".board.json") {
        serde_json::from_str::<Value>(&content)
            .ok()?
            .get("uuid")?
            .as_str()
            .map(str::to_string)
    } else {
        header_uuid(&content).map(str::to_string)
    }
}

// Replaces `path` via a synced sibling temp file and a rename, so a crash mid-write leaves the
// old version intact instead of a half-written file. The scan ignores `.tmp` files.
pub fn write_atomic(path: &Path, content: &[u8]) -> io::Result<()> {
    let mut tmp = path.as_os_str().to_owned();
    tmp.push(format!(".{}.tmp", Uuid::new_v4()));
    let result = (|| {
        {
            // Closed before the rename: Windows can't rename a file that's still open.
            let mut file = File::create_new(&tmp)?;
            file.write_all(content)?;
            file.sync_all()?;
        }
        fs::rename(&tmp, path)
    })();
    if result.is_err() {
        let _ = fs::remove_file(&tmp);
    }
    result
}

// (uuid, path relative to the library root), one per note or board.
pub type IndexRow = (String, String);

// Walks the library, writes a fresh uuid into notes (front matter) and boards (`uuid` key)
// that lack one or share a copied one, and returns the tree plus the (uuid, path) index rows.
// `previous` is the last index (uuid -> path): of files sharing a uuid, the one the index had
// keeps it, so Explorer/sync copies that sort first don't steal the original's identity.
// shortcut: reads every note on each scan; track mtimes to skip unchanged files once libraries get large.
pub fn scan(
    root: &Path,
    previous: &HashMap<String, String>,
) -> Result<(Vec<TreeNode>, Vec<IndexRow>), LibraryError> {
    let mut seen = HashSet::new();
    let mut index = Vec::new();
    let entries = fs::read_dir(root)?;
    let tree = scan_dir(root, entries, "", previous, &mut seen, &mut index)?;
    Ok((tree, index))
}

fn scan_dir(
    root: &Path,
    entries: fs::ReadDir,
    rel: &str,
    previous: &HashMap<String, String>,
    seen: &mut HashSet<String>,
    index: &mut Vec<IndexRow>,
) -> Result<Vec<TreeNode>, LibraryError> {
    // One unreadable (locked, non-UTF-8, no permission) entry shouldn't hide the whole library,
    // so unreadable folders and files, and files whose fix can't be written, are skipped.
    let mut entries = entries.filter_map(Result::ok).collect::<Vec<_>>();
    entries.sort_by_key(|e| e.file_name());

    let mut folders = Vec::new();
    let mut notes = Vec::new();
    for entry in entries {
        let name = entry.file_name().to_string_lossy().into_owned();
        if name.starts_with('.') {
            continue;
        }
        let path = if rel.is_empty() {
            name.clone()
        } else {
            format!("{rel}/{name}")
        };
        let Ok(file_type) = entry.file_type() else {
            continue;
        };

        if file_type.is_dir() {
            let Ok(dir) = fs::read_dir(entry.path()) else {
                continue;
            };
            let children = scan_dir(root, dir, &path, previous, seen, index)?;
            folders.push(TreeNode {
                name,
                path,
                uuid: None,
                children: Some(children),
                error: None,
            });
        } else if let Some((stem, is_board)) = name
            .strip_suffix(".board.json")
            .map(|s| (s, true))
            .or_else(|| name.strip_suffix(".md").map(|s| (s, false)))
        {
            // Unusable files stay in the tree with the reason, never rewritten, so a half-saved
            // board can't be clobbered and the user can see what needs fixing.
            let broken = |reason: String| TreeNode {
                name: stem.to_string(),
                path: path.clone(),
                uuid: None,
                children: None,
                error: Some(reason),
            };
            let content = match fs::read_to_string(entry.path()) {
                Ok(content) => content,
                // Locked by another program, or not UTF-8.
                Err(e) => {
                    notes.push(broken(format!("can't be read: {e}")));
                    continue;
                }
            };
            let mut board = None;
            let existing = if is_board {
                let obj = match serde_json::from_str::<Value>(&content) {
                    Ok(Value::Object(obj)) => obj,
                    Ok(_) => {
                        notes.push(broken("isn't a board file".into()));
                        continue;
                    }
                    Err(e) => {
                        notes.push(broken(format!("isn't valid JSON: {e}")));
                        continue;
                    }
                };
                let u = obj.get("uuid").and_then(Value::as_str).map(str::to_string);
                board = Some(obj);
                u
            } else {
                header_uuid(&content).map(str::to_string)
            };
            // The file the index had for this uuid keeps it, as long as it still carries it.
            let owned_elsewhere = |u: &str| match previous.get(u) {
                Some(p) if *p != path => file_uuid(&root.join(p)).as_deref() == Some(u),
                _ => false,
            };
            let uuid = match existing {
                Some(u) if !u.is_empty() && !seen.contains(&u) && !owned_elsewhere(&u) => u,
                _ => {
                    let u = Uuid::new_v4().to_string();
                    let updated = match board {
                        Some(mut obj) => {
                            obj.insert("uuid".into(), Value::from(u.clone()));
                            serde_json::to_string_pretty(&obj)?
                        }
                        None => with_uuid(&content, &u),
                    };
                    if write_atomic(&entry.path(), updated.as_bytes()).is_err() {
                        continue;
                    }
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
                error: None,
            });
        }
    }
    folders.extend(notes);
    Ok(folders)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_root() -> PathBuf {
        let root = std::env::temp_dir().join(format!("whiteboard-scan-{}", Uuid::new_v4()));
        fs::create_dir_all(&root).unwrap();
        root
    }

    #[test]
    fn reads_header_uuid() {
        assert_eq!(header_uuid("---\nuuid: a\n---\nbody"), Some("a"));
        assert_eq!(
            header_uuid("---\r\ntitle: x\r\nuuid: b\r\n---\r\n"),
            Some("b")
        );
        // Capstone-era header: no space, junk after the closing line.
        assert_eq!(header_uuid("---\nuuid:c\n---, \n text"), Some("c"));
        assert_eq!(header_uuid("# just a note\nuuid: d"), None);
        assert_eq!(header_uuid("---\ntitle: x\n---\nuuid: e"), None);
        assert_eq!(header_uuid("\u{FEFF}---\nuuid: f\n---\n"), Some("f"));
        // No closing line: a horizontal rule, not front matter.
        assert_eq!(header_uuid("---\nuuid: g\nbody"), None);
    }

    #[test]
    fn writes_header_uuid() {
        assert_eq!(with_uuid("hello", "u"), "---\nuuid: u\n---\nhello");
        assert_eq!(
            with_uuid("---\ntitle: x\nuuid: old\n---\nbody\nuuid: keep", "new"),
            "---\nuuid: new\ntitle: x\n---\nbody\nuuid: keep"
        );
        assert_eq!(
            header_uuid(&with_uuid("---\ntitle: x\n---\n", "z")),
            Some("z")
        );
    }

    #[test]
    fn bom_is_kept_once_in_front() {
        assert_eq!(
            with_uuid("\u{FEFF}hi", "u"),
            "\u{FEFF}---\nuuid: u\n---\nhi"
        );
        assert_eq!(
            with_uuid("\u{FEFF}---\nuuid: old\n---\nhi", "u"),
            "\u{FEFF}---\nuuid: u\n---\nhi"
        );
    }

    #[test]
    fn unclosed_rule_keeps_body_and_its_uuid_lines() {
        let body = "---\nuuid: not-a-header\nsome text\nuuid: also body";
        assert_eq!(with_uuid(body, "u"), format!("---\nuuid: u\n---\n{body}"));
        assert_eq!(with_uuid("---", "u"), "---\nuuid: u\n---\n---");
    }

    #[test]
    fn atomic_write_replaces_content_without_leftovers() {
        let root = temp_root();
        let file = root.join("note.md");
        fs::write(&file, "old content that is longer").unwrap();
        write_atomic(&file, b"new").unwrap();
        assert_eq!(fs::read_to_string(&file).unwrap(), "new");
        assert_eq!(
            fs::read_dir(&root).unwrap().count(),
            1,
            "no temp file left behind"
        );
        // A failed write (missing folder) leaves nothing behind either.
        assert!(write_atomic(&root.join("missing/x.md"), b"x").is_err());
        assert_eq!(fs::read_dir(&root).unwrap().count(), 1);
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn scan_assigns_unique_ids_to_notes_and_boards() {
        let root = temp_root();
        fs::create_dir_all(root.join("sub")).unwrap();
        fs::write(root.join("plain.md"), "no header").unwrap();
        fs::write(root.join("sub/copy.md"), "---\nuuid: same\n---\n").unwrap();
        fs::write(root.join("sub/orig.md"), "---\nuuid: same\n---\n").unwrap();
        fs::write(root.join("a.board.json"), r#"{"nodes":[],"edges":[]}"#).unwrap();
        fs::write(root.join("b.board.json"), r#"{"uuid":"same","nodes":[]}"#).unwrap();
        fs::write(root.join("broken.board.json"), "{not json").unwrap();
        fs::write(root.join("other.txt"), "ignored").unwrap();

        let (tree, index) = scan(&root, &HashMap::new()).unwrap();
        let ids: HashSet<_> = index.iter().map(|(u, _)| u.clone()).collect();
        assert_eq!(
            index.len(),
            5,
            "broken board and .txt are not indexed: {index:?}"
        );
        assert_eq!(ids.len(), 5, "every id is unique");
        // Folder first, then files by name; board names drop the double extension.
        let names: Vec<_> = tree.iter().map(|n| n.name.as_str()).collect();
        assert_eq!(names, ["sub", "a", "b", "broken", "plain"]);
        // The broken board is listed with its reason, not hidden.
        let broken = tree.iter().find(|n| n.name == "broken").unwrap();
        assert!(
            broken.uuid.is_none()
                && broken
                    .error
                    .as_deref()
                    .unwrap()
                    .starts_with("isn't valid JSON")
        );
        // Fixes were written back, and the broken board was left untouched.
        let board: Value =
            serde_json::from_str(&fs::read_to_string(root.join("a.board.json")).unwrap()).unwrap();
        assert!(ids.contains(board["uuid"].as_str().unwrap()));
        assert_eq!(board["nodes"], Value::Array(vec![]));
        assert!(header_uuid(&fs::read_to_string(root.join("plain.md")).unwrap()).is_some());
        assert_eq!(
            fs::read_to_string(root.join("broken.board.json")).unwrap(),
            "{not json"
        );
        // A second scan changes nothing.
        let previous = index.iter().cloned().collect();
        let (_, again) = scan(&root, &previous).unwrap();
        assert_eq!(again, index);
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn copy_sorting_first_does_not_steal_the_indexed_uuid() {
        let root = temp_root();
        // "note - Copy.md" sorts before "note.md".
        fs::write(root.join("note.md"), "---\nuuid: orig\n---\nmine").unwrap();
        fs::write(root.join("note - Copy.md"), "---\nuuid: orig\n---\nmine").unwrap();
        let previous = HashMap::from([("orig".to_string(), "note.md".to_string())]);

        let (_, index) = scan(&root, &previous).unwrap();
        assert!(
            index.contains(&("orig".into(), "note.md".into())),
            "{index:?}"
        );
        assert_ne!(
            header_uuid(&fs::read_to_string(root.join("note - Copy.md")).unwrap()),
            Some("orig")
        );
        assert_eq!(
            header_uuid(&fs::read_to_string(root.join("note.md")).unwrap()),
            Some("orig")
        );

        // Once the indexed file is gone (renamed outside the app), the remaining holder keeps the uuid.
        fs::remove_file(root.join("note.md")).unwrap();
        fs::write(root.join("renamed.md"), "---\nuuid: orig\n---\n").unwrap();
        let (_, index) = scan(&root, &previous).unwrap();
        assert!(
            index.contains(&("orig".into(), "renamed.md".into())),
            "{index:?}"
        );
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
