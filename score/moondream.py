import os
os.environ['DYLD_LIBRARY_PATH'] = '/opt/homebrew/lib:' + os.environ.get('DYLD_LIBRARY_PATH', '')

import sys
import json
from pathlib import Path
from transformers import AutoModelForCausalLM, AutoTokenizer
from PIL import Image
import pdf2image

def process_pdf(pdf_path, model):
    """Process a PDF file and extract content from each page using moondream."""

    print(f"Processing PDF: {pdf_path}")

    # Convert PDF pages to images
    print("Converting PDF to images...")
    images = pdf2image.convert_from_path(pdf_path)
    print(f"Found {len(images)} pages")

    results = {
        "filename": Path(pdf_path).name,
        "total_pages": len(images),
        "pages": []
    }

    # Process each page
    for page_num, image in enumerate(images, start=1):
        print(f"\nProcessing page {page_num}/{len(images)}...")

        # Generate caption for the page
        caption = model.caption(image, length="normal")["caption"]

        # Extract text content using visual query
        text_query = "What text is visible on this page? Transcribe all readable text."
        text_content = model.query(image, text_query)["answer"]

        page_data = {
            "page_number": page_num,
            "caption": caption,
            "text_content": text_content
        }

        results["pages"].append(page_data)
        print(f"Page {page_num} processed")

    return results

def main():
    if len(sys.argv) < 2:
        print("Usage: python moondream.py <pdf_file>")
        sys.exit(1)

    pdf_path = sys.argv[1]

    if not os.path.exists(pdf_path):
        print(f"Error: File '{pdf_path}' not found")
        sys.exit(1)

    # Load the Moondream model with MPS (Metal Performance Shaders) support
    print("Loading Moondream model...")
    model = AutoModelForCausalLM.from_pretrained(
        "vikhyatk/moondream2",
        revision="2025-01-09",
        trust_remote_code=True,
        device_map={"": "mps"}  # Enable GPU acceleration using MPS
    )
    print("Model loaded successfully\n")

    # Process the PDF
    results = process_pdf(pdf_path, model)

    # Save results to JSON file
    output_filename = Path(pdf_path).stem + "_output.json"
    with open(output_filename, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    print(f"\n✓ Results saved to: {output_filename}")
    print(f"✓ Processed {results['total_pages']} pages")

if __name__ == "__main__":
    main()