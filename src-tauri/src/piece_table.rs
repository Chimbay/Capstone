use crate::diagnostics::LibraryError;
use serde::Serialize;
use std::sync::Mutex;
use tauri::State;
pub struct AppState {
    pub piece_table: Mutex<Option<PieceTable>>,
}

#[derive(Clone, Copy, Serialize)]
enum BufferType {
    Original,
    Add,
}
#[derive(Clone, Serialize)]
pub struct Piece {
    buffer: BufferType,
    start: usize,
    len: usize,
}
pub struct PieceTable {
    original: String,
    add: String,
    pieces: Vec<Piece>,
}
impl PieceTable {
    pub fn new(text: String) -> Self {
        let len = text.len();
        Self {
            original: text,
            add: String::new(),
            pieces: vec![Piece {
                buffer: BufferType::Original,
                start: 0,
                len,
            }],
        }
    }

    pub fn get_text(&self) -> String {
        let mut result = String::new();
        for piece in &self.pieces {
            let buffer = match piece.buffer {
                BufferType::Original => &self.original,
                BufferType::Add => &self.add,
            };
            result.push_str(&buffer[piece.start..piece.start + piece.len]);
        }
        result
    }
    pub fn insert(&mut self, position: usize, text: &str) {
        // To insert, need index in a piece
        let (piece_index, offset_in_piece) = self.piece_at_position(position);
        // Add new text to add buffer
        let add_start = self.add.len();
        let text_length = text.len();
        self.add.push_str(text);

        // Split pieces
        let current_piece = self.pieces[piece_index].clone();

        let left_piece = Piece {
            buffer: current_piece.buffer,
            start: current_piece.start,
            len: offset_in_piece,
        };
        let new_piece = Piece {
            buffer: BufferType::Add,
            start: add_start,
            len: text_length,
        };
        let right_piece = Piece {
            buffer: current_piece.buffer,
            start: current_piece.start + offset_in_piece,
            len: current_piece.len - offset_in_piece,
        };

        self.pieces[piece_index] = left_piece;
        self.pieces.insert(piece_index + 1, new_piece);
        self.pieces.insert(piece_index + 2, right_piece);
    }
    fn piece_at_position(&self, position: usize) -> (usize, usize) {
        let mut current_pos = 0;

        for (i, piece) in self.pieces.iter().enumerate() {
            if current_pos + piece.len >= position {
                return (i, position - current_pos);
            }
            current_pos += piece.len
        }

        let last_index = self.pieces.len() - 1;
        (last_index, self.pieces[last_index].len)
    }

    // For debugging purposes
    fn get_table(&self) -> (&str, &str, &[Piece]) {
        (&self.original, &self.add, &self.pieces)
    }
}

#[tauri::command]
pub fn init_document(text: String, state: State<AppState>) -> Result<(), LibraryError> {
    let mut pt = state.piece_table.lock().unwrap();
    *pt = Some(PieceTable::new(text));
    Ok(())
}
#[tauri::command]
pub fn get_document_text(state: State<AppState>) -> Result<String, LibraryError> {
    let pt = state.piece_table.lock().unwrap();
    pt.as_ref().map(|table| table.get_text()).ok_or_else(|| {
        std::io::Error::new(std::io::ErrorKind::NotFound, "no document loaded").into()
    })
}
#[tauri::command]
pub fn insert_text(
    position: usize,
    text: String,
    state: State<AppState>,
) -> Result<(), LibraryError> {
    let mut pt = state.piece_table.lock().unwrap();
    if let Some(table) = pt.as_mut() {
        table.insert(position, &text);
    } else {
        std::io::Error::new(std::io::ErrorKind::NotFound, "no document loaded");
    }

    Ok(())
}
#[tauri::command]
pub fn get_table(state: State<AppState>) -> Result<(String, String, Vec<Piece>), LibraryError> {
    let pt = state.piece_table.lock().unwrap();

    let table = pt
        .as_ref()
        .ok_or_else(|| std::io::Error::new(std::io::ErrorKind::NotFound, "no document loaded"))?;

    let (orig, add, pieces) = table.get_table();

    Ok((orig.to_string(), add.to_string(), pieces.to_vec()))
}
