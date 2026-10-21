use serde::Serialize;

// A folder (children set), a note or board (uuid set), or a file the scan couldn't use (error set).
#[derive(Serialize)]
pub struct TreeNode {
    pub name: String,
    // Relative to the library root, '/'-separated.
    pub path: String,
    pub uuid: Option<String>,
    pub children: Option<Vec<TreeNode>>,
    // Why a note or board can't be opened (unreadable, invalid JSON). Shown in the tree
    // instead of hiding the file, so the user knows it exists and needs fixing.
    pub error: Option<String>,
}
