import os
os.environ['DYLD_LIBRARY_PATH'] = '/opt/homebrew/lib:' + os.environ.get('DYLD_LIBRARY_PATH', '')

import sys
import json
import time
import re
from pathlib import Path
from datetime import datetime, timedelta
from transformers import AutoModelForCausalLM
from PIL import Image
import pdf2image
from openai import OpenAI
import tiktoken
from ebooklib import epub, ITEM_IMAGE
from io import BytesIO

class MusicSheetAnalyzer:
    def __init__(self, pdf_path, model):
        self.pdf_path = pdf_path
        self.model = model
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
        """Extract images from EPUB file."""
        book = epub.read_epub(epub_path)
        images = []

        # Get all image items from the EPUB
        for item in book.get_items():
            if item.get_type() == ITEM_IMAGE:
                try:
                    # Convert image bytes to PIL Image
                    img_data = item.get_content()
                    img = Image.open(BytesIO(img_data))

                    # Convert to RGB if necessary
                    if img.mode != 'RGB':
                        img = img.convert('RGB')

                    images.append(img)
                except Exception as e:
                    print(f"   Warning: Could not process image: {e}")
                    continue

        return images

    def analyze_page_for_song(self, image, page_num):
        """Extract raw text from top of page - simple extraction, no complex logic."""

        # Query to extract the LARGEST, most prominent text
        extraction_query = """Look at this music sheet page.

What is the LARGEST, BOLDEST text at the very top of the page?

This is usually the song title. It's typically:
- Much larger than other text
- At the very top, above everything else
- Often in all capitals

DO NOT write:
- Small text like tempo markings (Moderately, Slow, etc.)
- Chord symbols (Am, G7, etc.)
- Lyrics or sheet music text
- Musical directions (To Coda, D.S., etc.)

Write ONLY the largest, boldest text you see at the top:"""

        response = self.model.query(image, extraction_query)["answer"].strip()

        page_data = {
            "page_number": page_num,
            "top_text": response,
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
        return f"""You are analyzing a music sheet PDF. For each page, I've extracted the text from the top of the page.

Your task: Identify which pages START a new song (have a song title at the top) vs which pages are CONTINUATIONS (song continues from previous page).

Song titles are typically:
- Large, bold, all-caps text at the top
- Recognizable song names
- NOT lyrics, NOT chord symbols (like Am, G7), NOT musical directions

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

        client = OpenAI(api_key=api_key)

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
                response = client.chat.completions.create(
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
            pages_done = page_num - 1
            eta = self.estimate_time_remaining(pages_done, total_pages, elapsed)

            print(f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            print(f"📃 Page {page_num}/{total_pages}")
            print(f"⏱️  Elapsed: {self.format_time(elapsed)} | ETA: {eta}")
            print(f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

            # Analyze page
            page_data = self.analyze_page_for_song(image, page_num)
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
        print("Usage: python analyze_music_sheets.py <pdf_or_epub_file> [--start-page N]")
        print("\nThis script analyzes music sheet PDFs/EPUBs and creates an index of songs.")
        print("Supports both PDF and EPUB formats.")
        print("It tracks progress and can resume if interrupted.")
        print("\nOptions:")
        print("  --start-page N    Start analysis from page N (default: 1)")
        print("                    Use this to skip intro/description pages")
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

    print("="*50)
    print("🎼 MUSIC SHEET PDF ANALYZER")
    print("="*50)
    print(f"📁 File: {pdf_path}")
    if start_page_override > 1:
        print(f"🔢 Starting from page: {start_page_override}")
    print(f"⏰ Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

    # Load the Moondream model
    print("🤖 Loading Moondream model...")
    model = AutoModelForCausalLM.from_pretrained(
        "vikhyatk/moondream2",
        revision="2025-01-09",
        trust_remote_code=True,
        device_map={"": "mps"}
    )
    print("✓ Model loaded successfully\n")

    # Create analyzer and run
    analyzer = MusicSheetAnalyzer(pdf_path, model)
    analyzer.analyze(start_page_override=start_page_override)

if __name__ == "__main__":
    main()
