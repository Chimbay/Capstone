use serde::Serialize;

// A folder (children set) or a note (uuid set) in the library tree.
#[derive(Serialize)]
pub struct TreeNode {
    pub name: String,
    // Relative to the library root, '/'-separated.
    pub path: String,
    pub uuid: Option<String>,
    pub children: Option<Vec<TreeNode>>,
}
