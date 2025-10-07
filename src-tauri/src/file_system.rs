use lopdf::Document;

fn pdf_extract() -> Result<String, Box<dyn std::error::Error>> {
    let mut doc = Document::load("something")?;
    let page_numbers: Vec<u32> = doc.get_pages().keys().copied().collect();
    let text = doc.extract_text(&page_numbers)?.replace("\n", " ");
    Ok(text)
}