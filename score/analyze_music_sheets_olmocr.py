import os
import sys
import json
import time
import base64
import re
from io import BytesIO
from pathlib import Path
from datetime import datetime, timedelta
import pdf2image
from openai import OpenAI
from ebooklib import epub, ITEM_IMAGE
from PIL import Image as PILImage
import tiktoken

class MusicSheetAnalyzerOLMoOCR:
    def __init__(self, pdf_path, deepinfra_client, openai_client):
        self.pdf_path = pdf_path
        self.deepinfra_client = deepinfra_client
        self.openai_client = openai_client
        self.checkpoint_file = Path(pdf_path).stem + "_checkpoint.json"
        self.output_file = Path(pdf_path).stem + "_index.json"
        self.start_time = None

    def load_checkpoint(self):
        """Load progress from checkpoint file if it exists."""
        if os.path.exists(self.checkpoint_file):
            with open(self.checkpoint_file, 'r', encoding='utf-8') as f:
                checkpoint = json.load(f)
                print(f"📁 Found checkpoint: Resuming from page {checkpoint['last_processed_page'] + 1}")
                return checkpoint
        return None

    def save_checkpoint(self, data):
        """Save current progress to checkpoint file."""
        with open(self.checkpoint_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

    def save_final_index(self, data):
        """Save final song index to output file."""
        with open(self.output_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

        # Remove checkpoint file after successful completion
        if os.path.exists(self.checkpoint_file):
            os.remove(self.checkpoint_file)

    def estimate_time_remaining(self, pages_done, total_pages, elapsed_seconds):
        """Calculate estimated time remaining."""
        if pages_done == 0:
            return "Calculating..."

        avg_time_per_page = elapsed_seconds / pages_done
        pages_remaining = total_pages - pages_done
        seconds_remaining = avg_time_per_page * pages_remaining

        return str(timedelta(seconds=int(seconds_remaining)))

    def format_time(self, seconds):
        """Format seconds into readable time string."""
        return str(timedelta(seconds=int(seconds)))

    def load_document_images(self, file_path):
        """Load images from PDF or EPUB file."""
        file_ext = Path(file_path).suffix.lower()

        if file_ext == '.pdf':
            return pdf2image.convert_from_path(file_path)
        elif file_ext == '.epub':
            return self.load_epub_images(file_path)
        else:
            raise ValueError(f"Unsupported file format: {file_ext}. Only PDF and EPUB are supported.")

    def load_epub_images(self, epub_path):
        """Convert EPUB to full-page images including titles."""
        # For EPUBs, we need to render the HTML pages to images
        # First, convert EPUB to PDF using external tool, then extract images

        print("   Converting EPUB to PDF (this preserves titles)...")

        # Create temp PDF path
        temp_pdf = epub_path.replace('.epub', '_temp.pdf')

        # Use ebook-convert (from Calibre) if available
        import subprocess
        try:
            subprocess.run([
                'ebook-convert',
                epub_path,
                temp_pdf,
                '--paper-size', 'letter',
                '--pdf-page-margin-left', '36',
                '--pdf-page-margin-right', '36',
                '--pdf-page-margin-top', '36',
                '--pdf-page-margin-bottom', '36'
            ], check=True, capture_output=True)

            print("   ✓ Converted to PDF")

            # Now extract images from the PDF
            images = pdf2image.convert_from_path(temp_pdf)

            # Clean up temp PDF
            import os
            os.remove(temp_pdf)

            return images

        except FileNotFoundError:
            print("   ⚠️  ebook-convert not found. Install Calibre for EPUB support.")
            print("   Falling back to image extraction (titles may be missing)...")
            return self.load_epub_images_fallback(epub_path)
        except Exception as e:
            print(f"   ⚠️  Error converting EPUB: {e}")
            print("   Falling back to image extraction...")
            return self.load_epub_images_fallback(epub_path)

    def load_epub_images_fallback(self, epub_path):
        """Fallback: Extract embedded images only (may miss titles)."""
        book = epub.read_epub(epub_path)
        images = []

        # Get all image items from the EPUB
        for item in book.get_items():
            if item.get_type() == ITEM_IMAGE:
                try:
                    # Convert image bytes to PIL Image
                    img_data = item.get_content()
                    img = PILImage.open(BytesIO(img_data))

                    # Convert to RGB if necessary
                    if img.mode != 'RGB':
                        img = img.convert('RGB')

                    images.append(img)
                except Exception as e:
                    print(f"   Warning: Could not process image: {e}")
                    continue

        return images

    def image_to_base64(self, image):
        """Convert PIL Image to base64 string."""
        buffered = BytesIO()
        image.save(buffered, format="PNG")
        img_bytes = buffered.getvalue()
        return base64.b64encode(img_bytes).decode('utf-8')

    def analyze_page_with_olmocr(self, image, page_num):
        """Extract text from page using OLMoOCR via DeepInfra."""

        # DEBUG: Save image for inspection
        debug_dir = Path("debug_images")
        debug_dir.mkdir(exist_ok=True)
        debug_path = debug_dir / f"page_{page_num:04d}.png"
        image.save(debug_path)

        # Convert image to base64
        image_base64 = self.image_to_base64(image)

        # Query OLMoOCR for text extraction
        prompt = """Look at the top portion of this music sheet page (top 20%).
What is the LARGEST, most prominent text you can see there?

This text is usually the song title. Ignore:
- Small text (page numbers, copyright)
- Musical notation symbols
- Chord names

Write only the largest text you see:"""

        try:
            response = self.deepinfra_client.chat.completions.create(
                model="allenai/olmOCR-2-7B-1025",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": prompt
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/png;base64,{image_base64}"
                                }
                            }
                        ]
                    }
                ],
                max_tokens=500
            )

            extracted_text = response.choices[0].message.content.strip()

        except Exception as e:
            print(f"   ⚠️  Error calling OLMoOCR: {e}")
            extracted_text = "ERROR"

        page_data = {
            "page_number": page_num,
            "top_text": extracted_text,
            "timestamp": datetime.now().isoformat()
        }

        return page_data

    def strip_text(self, text):
        """Strip unnecessary characters to reduce token count."""
        # Remove multiple spaces
        text = re.sub(r'\s+', ' ', text)
        # Remove special characters but keep letters, numbers, basic punctuation
        text = re.sub(r'[^\w\s\-\'\"\.,!?]', '', text)
        # Trim
        return text.strip()

    def count_tokens(self, text):
        """Count tokens in text using OpenAI's tokenizer."""
        try:
            encoding = tiktoken.encoding_for_model("gpt-4o-mini")
            return len(encoding.encode(text))
        except Exception:
            # Fallback: rough estimate (1 token ≈ 4 chars)
            return len(text) // 4

    def create_batch_prompt(self, pages_batch):
        """Create prompt for a batch of pages."""
        return f"""You are analyzing a music sheet PDF. For each page, I've extracted the text from the top of the page using OCR.

Your task: Identify which pages START a new song (have a song title at the top) vs which pages are CONTINUATIONS (song continues from previous page).

Song titles are typically:
- Large, bold text at the top
- Recognizable song names
- NOT lyrics, NOT chord symbols (like Am, G7, Dm7), NOT musical directions (To Coda, D.S.)
- NOT book metadata (table of contents, artist bio, etc.)

Here's the data from pages {pages_batch[0]['page']} to {pages_batch[-1]['page']}:
{json.dumps(pages_batch, indent=2)}

Respond with a JSON array of objects for ONLY the pages that start new songs:
[
  {{"page": 11, "title": "AND I LOVE YOU SO"}},
  {{"page": 14, "title": "AMERICAN PIE"}},
  ...
]

Only include pages that clearly start a NEW song. Skip continuation pages, index pages, artist bio pages, etc.
Respond with ONLY the JSON array, no other text."""

    def cleanup_with_openai(self, page_data_list, api_key):
        """Use OpenAI to intelligently identify song titles vs continuations."""

        print("\n🤖 Analyzing with OpenAI to identify song boundaries...")

        # Prepare stripped data for OpenAI
        pages_summary = []
        for page in page_data_list:
            stripped_text = self.strip_text(page["top_text"])
            # Limit each page's text to 100 chars max
            if len(stripped_text) > 100:
                stripped_text = stripped_text[:100]

            pages_summary.append({
                "page": page["page_number"],
                "text": stripped_text
            })

        # Calculate optimal batch size
        max_tokens_per_batch = 115000  # Leave some headroom

        # Create a sample prompt to accurately measure overhead
        sample_batch = pages_summary[:10] if len(pages_summary) >= 10 else pages_summary
        sample_prompt = self.create_batch_prompt(sample_batch)
        sample_tokens = self.count_tokens(sample_prompt)

        # Calculate actual tokens per page (including JSON formatting)
        data_only_tokens = self.count_tokens(json.dumps(sample_batch, indent=2))
        overhead_tokens = sample_tokens - data_only_tokens
        tokens_per_page = data_only_tokens / len(sample_batch)

        print(f"📏 Token estimates:")
        print(f"   • Overhead: {overhead_tokens:,} tokens")
        print(f"   • Per page: {tokens_per_page:.1f} tokens")

        pages_per_batch = max(int((max_tokens_per_batch - overhead_tokens) / tokens_per_page), 1)
        print(f"   • Calculated batch size: {pages_per_batch} pages\n")

        # Split into batches
        batches = []
        for i in range(0, len(pages_summary), pages_per_batch):
            batches.append(pages_summary[i:i + pages_per_batch])

        print(f"📦 Total batches: {len(batches)}")

        # Process each batch
        all_song_starts = []

        for batch_num, batch in enumerate(batches, 1):
            print(f"\n   Processing batch {batch_num}/{len(batches)} (pages {batch[0]['page']}-{batch[-1]['page']})...")

            prompt = self.create_batch_prompt(batch)

            # Verify token count
            token_count = self.count_tokens(prompt)
            print(f"   Tokens: {token_count:,}")

            if token_count > 120000:
                print(f"   ⚠️  Batch still too large! Skipping...")
                continue

            try:
                response = self.openai_client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0
                )

                # Parse response
                content = response.choices[0].message.content.strip()

                # Remove markdown code blocks if present
                if content.startswith("```"):
                    content = content.split("```")[1]
                    if content.startswith("json"):
                        content = content[4:]
                    content = content.strip()

                batch_results = json.loads(content)
                all_song_starts.extend(batch_results)
                print(f"   ✓ Found {len(batch_results)} songs in this batch")

            except Exception as e:
                print(f"   ❌ Error processing batch: {e}")
                continue

        print(f"\n✓ Total songs identified: {len(all_song_starts)}\n")

        return all_song_starts

    def build_song_index(self, song_starts, total_pages):
        """Build final song index from OpenAI-identified song starts."""
        songs = []

        # Sort by page number
        song_starts_sorted = sorted(song_starts, key=lambda x: x['page'])

        for i, song_start in enumerate(song_starts_sorted):
            start_page = song_start['page']

            # Determine end page (page before next song, or last page)
            if i < len(song_starts_sorted) - 1:
                end_page = song_starts_sorted[i + 1]['page'] - 1
            else:
                end_page = total_pages

            songs.append({
                "title": song_start['title'],
                "start_page": start_page,
                "end_page": end_page
            })

        return songs

    def analyze(self, start_page_override=1):
        """Main analysis function with progress tracking and recovery."""

        self.start_time = time.time()

        # Load checkpoint if exists
        checkpoint = self.load_checkpoint()

        if checkpoint:
            page_data_list = checkpoint['page_data']
            start_page = checkpoint['last_processed_page'] + 1
            print(f"🔄 Resuming analysis...")
        else:
            page_data_list = []
            start_page = start_page_override
            print(f"🆕 Starting new analysis...")
            if start_page_override > 1:
                print(f"⏩ Skipping pages 1-{start_page_override - 1}")

        # Convert document to images (PDF or EPUB)
        print(f"\n📄 Converting document to images...")
        images = self.load_document_images(self.pdf_path)
        total_pages = len(images)
        print(f"✓ Found {total_pages} pages\n")

        # Process each page
        for page_num in range(start_page, total_pages + 1):
            page_index = page_num - 1  # 0-based index for images array
            image = images[page_index]

            # Calculate progress
            elapsed = time.time() - self.start_time
            pages_done = page_num - start_page
            eta = self.estimate_time_remaining(pages_done, total_pages - start_page + 1, elapsed)

            print(f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            print(f"📃 Page {page_num}/{total_pages}")
            print(f"⏱️  Elapsed: {self.format_time(elapsed)} | ETA: {eta}")
            print(f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

            # Analyze page with OLMoOCR
            page_data = self.analyze_page_with_olmocr(image, page_num)
            page_data_list.append(page_data)

            # Show extracted text
            text_preview = page_data['top_text'][:60] + "..." if len(page_data['top_text']) > 60 else page_data['top_text']
            print(f"   📝 Extracted: {text_preview}")

            # Save checkpoint after each page
            checkpoint_data = {
                "filename": Path(self.pdf_path).name,
                "total_pages": total_pages,
                "last_processed_page": page_num,
                "last_updated": datetime.now().isoformat(),
                "page_data": page_data_list
            }
            self.save_checkpoint(checkpoint_data)
            print(f"   ✓ Progress saved\n")

        # Use OpenAI to clean up and identify songs
        print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

        # Get OpenAI API key
        api_key = os.environ.get('OPENAI_API_KEY')
        if not api_key:
            print("⚠️  OPENAI_API_KEY not found in environment")
            print("Please set it with: export OPENAI_API_KEY='your-key'")
            print("\nProceeding with raw data only (no cleanup)...")
            song_starts = []
        else:
            song_starts = self.cleanup_with_openai(page_data_list, api_key)

        print("🔨 Building final song index...")
        songs = self.build_song_index(song_starts, total_pages) if song_starts else []

        final_index = {
            "filename": Path(self.pdf_path).name,
            "total_pages": total_pages,
            "total_songs": len(songs),
            "generated_at": datetime.now().isoformat(),
            "processing_time": self.format_time(time.time() - self.start_time),
            "songs": songs,
            "raw_page_data": page_data_list  # Keep raw data for debugging
        }

        # Save final index
        self.save_final_index(final_index)

        total_time = time.time() - self.start_time
        print(f"\n{'='*50}")
        print(f"✅ ANALYSIS COMPLETE!")
        print(f"{'='*50}")
        print(f"📊 Statistics:")
        print(f"   • Total pages processed: {total_pages}")
        print(f"   • Songs detected: {len(songs)}")
        print(f"   • Processing time: {self.format_time(total_time)}")
        print(f"   • Average per page: {total_time/total_pages:.2f}s")
        print(f"\n💾 Output saved to: {self.output_file}")
        print(f"🧹 Checkpoint file removed\n")

        return final_index

def main():
    if len(sys.argv) < 2:
        print("Usage: python analyze_music_sheets_olmocr.py <pdf_or_epub_file> [--start-page N]")
        print("\nThis script analyzes music sheet PDFs/EPUBs using OLMoOCR (supports Hebrew).")
        print("Supports both PDF and EPUB formats.")
        print("It tracks progress and can resume if interrupted.")
        print("\nOptions:")
        print("  --start-page N    Start analysis from page N (default: 1)")
        print("                    Use this to skip intro/description pages")
        print("\nRequired environment variables:")
        print("  DEEPINFRA_TOKEN   Your DeepInfra API token")
        print("  OPENAI_API_KEY    Your OpenAI API key (for cleanup stage)")
        sys.exit(1)

    pdf_path = sys.argv[1]
    start_page_override = 1

    # Parse optional --start-page argument
    if len(sys.argv) >= 4 and sys.argv[2] == '--start-page':
        try:
            start_page_override = int(sys.argv[3])
            if start_page_override < 1:
                print("❌ Error: Start page must be >= 1")
                sys.exit(1)
        except ValueError:
            print("❌ Error: Start page must be a number")
            sys.exit(1)

    if not os.path.exists(pdf_path):
        print(f"❌ Error: File '{pdf_path}' not found")
        sys.exit(1)

    if not (pdf_path.lower().endswith('.pdf') or pdf_path.lower().endswith('.epub')):
        print(f"❌ Error: File must be a PDF or EPUB")
        sys.exit(1)

    # Check for API keys
    deepinfra_token = os.environ.get('DEEPINFRA_TOKEN')
    if not deepinfra_token:
        print("❌ Error: DEEPINFRA_TOKEN not found in environment")
        print("Set it with: export DEEPINFRA_TOKEN='your-token'")
        sys.exit(1)

    openai_key = os.environ.get('OPENAI_API_KEY')
    if not openai_key:
        print("⚠️  Warning: OPENAI_API_KEY not found - cleanup stage will be skipped")

    print("="*50)
    print("🎼 MUSIC SHEET PDF ANALYZER (OLMoOCR)")
    print("="*50)
    print(f"📁 File: {pdf_path}")
    if start_page_override > 1:
        print(f"🔢 Starting from page: {start_page_override}")
    print(f"⏰ Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

    # Initialize DeepInfra client (OpenAI-compatible)
    print("🔧 Initializing OLMoOCR client...")
    deepinfra_client = OpenAI(
        api_key=deepinfra_token,
        base_url="https://api.deepinfra.com/v1/openai"
    )
    print("✓ OLMoOCR client ready\n")

    # Initialize OpenAI client for cleanup
    openai_client = OpenAI(api_key=openai_key) if openai_key else None

    # Create analyzer and run
    analyzer = MusicSheetAnalyzerOLMoOCR(pdf_path, deepinfra_client, openai_client)
    analyzer.analyze(start_page_override=start_page_override)

if __name__ == "__main__":
    main()
