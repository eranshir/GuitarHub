import os
import sys
import json
import re
from pathlib import Path
from datetime import datetime
from openai import OpenAI
import tiktoken

def strip_text(text):
    """Strip unnecessary characters to reduce token count."""
    # Remove multiple spaces
    text = re.sub(r'\s+', ' ', text)
    # Remove special characters but keep letters, numbers, basic punctuation
    text = re.sub(r'[^\w\s\-\'\"\.,!?]', '', text)
    # Trim
    return text.strip()

def count_tokens(text):
    """Count tokens in text using OpenAI's tokenizer."""
    try:
        encoding = tiktoken.encoding_for_model("gpt-4o-mini")
        return len(encoding.encode(text))
    except Exception:
        # Fallback: rough estimate (1 token ≈ 4 chars)
        return len(text) // 4

def create_batch_prompt(pages_batch):
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

def cleanup_with_openai(page_data_list, client):
    """Use OpenAI to intelligently identify song titles vs continuations."""

    print("\n🤖 Analyzing with OpenAI to identify song boundaries...")

    # Prepare stripped data for OpenAI
    pages_summary = []
    for page in page_data_list:
        stripped_text = strip_text(page["top_text"])
        # Limit each page's text to 100 chars max
        if len(stripped_text) > 100:
            stripped_text = stripped_text[:100]

        pages_summary.append({
            "page": page["page_number"],
            "text": stripped_text
        })

    # Calculate optimal batch size
    base_prompt_tokens = 500  # Approximate overhead for instructions
    max_tokens_per_batch = 115000  # Leave some headroom

    # Estimate tokens per page
    sample_page_json = json.dumps(pages_summary[:1], indent=2)
    tokens_per_page = count_tokens(sample_page_json)

    pages_per_batch = max((max_tokens_per_batch - base_prompt_tokens) // tokens_per_page, 1)

    # Split into batches
    batches = []
    for i in range(0, len(pages_summary), pages_per_batch):
        batches.append(pages_summary[i:i + pages_per_batch])

    print(f"📊 Total pages: {len(pages_summary)}")
    print(f"📦 Batches needed: {len(batches)} (approx {pages_per_batch} pages per batch)")

    # Process each batch
    all_song_starts = []

    for batch_num, batch in enumerate(batches, 1):
        print(f"\n   Processing batch {batch_num}/{len(batches)} (pages {batch[0]['page']}-{batch[-1]['page']})...")

        prompt = create_batch_prompt(batch)

        # Verify token count
        token_count = count_tokens(prompt)
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

def build_song_index(song_starts, total_pages):
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

def main():
    if len(sys.argv) < 2:
        print("Usage: python finish_analysis.py <checkpoint_or_incomplete_index_file.json>")
        print("\nThis script completes an incomplete analysis by running the OpenAI cleanup stage.")
        print("Use this when you have raw page_data but no songs list.")
        print("\nRequired environment variable:")
        print("  OPENAI_API_KEY    Your OpenAI API key")
        sys.exit(1)

    input_file = sys.argv[1]

    if not os.path.exists(input_file):
        print(f"❌ Error: File '{input_file}' not found")
        sys.exit(1)

    # Check for OpenAI API key
    api_key = os.environ.get('OPENAI_API_KEY')
    if not api_key:
        print("❌ Error: OPENAI_API_KEY not found in environment")
        print("Set it with: export OPENAI_API_KEY='your-key'")
        sys.exit(1)

    print("="*50)
    print("🔧 FINISH INCOMPLETE ANALYSIS")
    print("="*50)
    print(f"📁 Input: {input_file}")
    print(f"⏰ Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

    # Load the checkpoint/incomplete file
    print("📂 Loading checkpoint data...")
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # Check if it has page_data
    if 'page_data' not in data:
        print("❌ Error: File doesn't contain 'page_data' field")
        print("This script is for processing checkpoint files or incomplete indices.")
        sys.exit(1)

    page_data = data['page_data']
    total_pages = data.get('total_pages', data.get('last_processed_page', len(page_data)))
    filename = data.get('filename', Path(input_file).stem + '.pdf')

    print(f"✓ Found {len(page_data)} pages of raw data")
    print(f"📄 Original file: {filename}\n")

    # Initialize OpenAI client
    client = OpenAI(api_key=api_key)

    # Run OpenAI cleanup
    song_starts = cleanup_with_openai(page_data, client)

    # Build final index
    print("🔨 Building final song index...")
    songs = build_song_index(song_starts, total_pages)

    # Create final index
    final_index = {
        "filename": filename,
        "total_pages": total_pages,
        "total_songs": len(songs),
        "generated_at": datetime.now().isoformat(),
        "songs": songs
    }

    # Save final index (without raw page_data to keep it small)
    output_file = Path(input_file).stem.replace('_checkpoint', '') + '_index.json'

    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(final_index, f, indent=2, ensure_ascii=False)

    print(f"\n{'='*50}")
    print(f"✅ ANALYSIS COMPLETED!")
    print(f"{'='*50}")
    print(f"📊 Statistics:")
    print(f"   • Total pages: {total_pages}")
    print(f"   • Songs detected: {len(songs)}")
    print(f"\n💾 Output saved to: {output_file}\n")

    # Show first few songs
    if songs:
        print("📋 Sample songs detected:")
        for song in songs[:5]:
            print(f"   • {song['title']} (pages {song['start_page']}-{song['end_page']})")
        if len(songs) > 5:
            print(f"   ... and {len(songs) - 5} more")

if __name__ == "__main__":
    main()
