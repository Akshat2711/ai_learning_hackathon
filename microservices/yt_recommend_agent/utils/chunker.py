def chunk_text(text: str, size: int = 2500, overlap: int = 300):
    chunks = []
    start = 0

    while start < len(text):
        end = start + size
        chunks.append(text[start:end])
        start = end - overlap

    return chunks
