#!/usr/bin/env python3
"""
Extract chord sequences from music sheet PDFs using OCR.
This tool extracts factual chord information (chord symbols) from sheet music
for personal study and analysis purposes.
"""

import json
import re
import sys
import os
import base64
from pathlib import Path
from typing import List, Dict, Optional, Tuple
from io import BytesIO
import argparse

try:
    from pdf2image import convert_from_path
    from PIL import Image
    import cv2
    import numpy as np
except ImportError as e:
    print(f"Missing required library: {e}")
    print("\nPlease install required packages:")
    print("pip install pdf2image pillow opencv-python")
    sys.exit(1)

# Optional: Tesseract for default OCR
try:
    import pytesseract
    TESSERACT_AVAILABLE = True
except ImportError:
    TESSERACT_AVAILABLE = False

# Optional: OpenAI client for OLM OCR
try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False


class ChordExtractor:
    """Extracts chord symbols from music sheet images using OCR."""

    # Common chord patterns (root note + quality)
    CHORD_PATTERN = re.compile(
        r'\b([A-G][#♯b♭]?)'  # Root note with optional sharp/flat
        r'(maj7|min7|m7|maj9|maj|min|dim7|dim|aug|sus4|sus2|add9|'  # Qualities
        r'7sus4|7b5|7b9|7#9|7#11|6/9|m6|[679]|11|13|m9|\+|°)?'
        r'(?:/([A-G][#♯b♭]?))?'  # Optional bass note (slash chord)
        r'\b'
    )

    def __init__(self, score_dir: Path, use_olm: bool = False, deepinfra_token: str = None):
        self.score_dir = score_dir
        self.use_olm = use_olm
        self.deepinfra_client = None

        if use_olm:
            if not OPENAI_AVAILABLE:
                print("Error: OpenAI library not installed. Install with: pip install openai")
                sys.exit(1)
            if not deepinfra_token:
                print("Error: DEEPINFRA_TOKEN required for OLM OCR")
                print("Set it with: export DEEPINFRA_TOKEN='your-token'")
                sys.exit(1)

            self.deepinfra_client = OpenAI(
                api_key=deepinfra_token,
                base_url="https://api.deepinfra.com/v1/openai"
            )
            print("✓ Using OLM OCR (allenai/olmOCR-2-7B-1025)")
        else:
            if not TESSERACT_AVAILABLE:
                print("Error: pytesseract not installed. Install with: pip install pytesseract")
                print("Or use --use-olm flag for OLM OCR instead")
                sys.exit(1)
            print("✓ Using Tesseract OCR")

    def load_book_index(self, book_name: str) -> Optional[Dict]:
        """Load the index JSON file for a given book."""
        index_path = self.score_dir / f"{book_name}_index.json"

        if not index_path.exists():
            print(f"Error: Index file not found: {index_path}")
            return None

        with open(index_path, 'r', encoding='utf-8') as f:
            return json.load(f)

    def find_song(self, book_index: Dict, song_name: str) -> Optional[Dict]:
        """Find a song in the book index by name (case-insensitive partial match)."""
        song_name_lower = song_name.lower()

        for song in book_index['songs']:
            if song_name_lower in song['title'].lower():
                return song

        return None

    def extract_pages_from_pdf(self, pdf_path: Path, start_page: int, end_page: int) -> List[Image.Image]:
        """Extract specific pages from a PDF as images."""
        print(f"Extracting pages {start_page}-{end_page} from {pdf_path.name}...")

        try:
            # Convert PDF pages to images (page numbers are 1-indexed)
            images = convert_from_path(
                pdf_path,
                first_page=start_page,
                last_page=end_page,
                dpi=300  # High DPI for better OCR accuracy
            )
            return images
        except Exception as e:
            print(f"Error extracting PDF pages: {e}")
            return []

    def preprocess_image_for_chord_detection(self, image: Image.Image) -> np.ndarray:
        """Preprocess image to improve chord symbol detection."""
        # Convert PIL image to OpenCV format
        img_array = np.array(image)

        # Convert to grayscale
        gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)

        # Apply adaptive thresholding to handle varying lighting
        thresh = cv2.adaptiveThreshold(
            gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY, 11, 2
        )

        return thresh

    def image_to_base64(self, image: Image.Image) -> str:
        """Convert PIL Image to base64 string."""
        buffered = BytesIO()
        image.save(buffered, format="PNG")
        img_bytes = buffered.getvalue()
        return base64.b64encode(img_bytes).decode('utf-8')

    def extract_text_with_olm(self, image: Image.Image, page_num: int) -> str:
        """Extract text from image using OLM OCR via DeepInfra."""
        # Convert image to base64
        image_base64 = self.image_to_base64(image)

        # Query OLMoOCR for text extraction
        prompt = """Extract ALL text from this music sheet page, especially chord symbols.

Please extract:
- ALL chord symbols (C, Am, G7, Dmaj7, etc.)
- Lyrics
- Any other text on the page

Format the output so chord symbols are clearly visible and separated from lyrics.
List all the text you can read on this page:"""

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
                max_tokens=2000
            )

            extracted_text = response.choices[0].message.content.strip()
            return extracted_text

        except Exception as e:
            print(f"   ⚠️  Error calling OLM OCR: {e}")
            return ""

    def extract_text_from_image(self, image: Image.Image, page_num: int = 0) -> str:
        """Extract all text from an image using OCR (Tesseract or OLM)."""
        if self.use_olm:
            return self.extract_text_with_olm(image, page_num)
        else:
            # Preprocess for better OCR
            processed = self.preprocess_image_for_chord_detection(image)

            # Convert back to PIL Image
            processed_pil = Image.fromarray(processed)

            # Run OCR with configuration optimized for chord symbols
            custom_config = r'--oem 3 --psm 6'
            text = pytesseract.image_to_string(processed_pil, config=custom_config)

            return text

    def extract_chords_from_text(self, text: str) -> List[str]:
        """Extract chord symbols from OCR text."""
        chords = []
        seen = set()

        lines = text.split('\n')
        for line in lines:
            # Find all chord matches in this line
            matches = self.CHORD_PATTERN.finditer(line)

            for match in matches:
                root = match.group(1)
                quality = match.group(2) or ''
                bass = match.group(3)

                # Construct chord symbol
                chord = f"{root}{quality}"
                if bass:
                    chord += f"/{bass}"

                # Filter out false positives (common words that look like chords)
                if self.is_valid_chord(chord, line):
                    # Avoid duplicates in sequence but preserve order
                    chord_key = chord.lower()
                    if chord_key not in seen or len(chords) == 0 or chords[-1].lower() != chord_key:
                        chords.append(chord)
                        seen.add(chord_key)

        return chords

    def is_valid_chord(self, chord: str, context: str) -> bool:
        """Validate that a chord symbol is likely a real chord, not a false positive."""
        # Exclude common false positives
        false_positives = ['A', 'Am', 'C', 'D', 'E', 'F', 'G']

        # If it's a single letter and appears in a sentence context, might be false positive
        if len(chord) == 1 and any(word in context.lower() for word in ['the', 'and', 'or', 'to', 'in', 'of']):
            return False

        # Valid if it has a quality suffix or appears in uppercase context
        if len(chord) > 1 or context.isupper():
            return True

        return True  # Default to accepting

    def save_images_as_pdf(self, images: List[Image.Image], output_path: Path) -> None:
        """Save a list of images as a PDF file."""
        if not images:
            return

        # Convert all images to RGB (required for PDF)
        rgb_images = []
        for img in images:
            if img.mode != 'RGB':
                img = img.convert('RGB')
            rgb_images.append(img)

        # Save as PDF
        if len(rgb_images) == 1:
            rgb_images[0].save(output_path, 'PDF')
        else:
            rgb_images[0].save(
                output_path,
                'PDF',
                save_all=True,
                append_images=rgb_images[1:]
            )

        print(f"\n📄 Extracted pages saved to: {output_path}")

    def extract_chords_from_pages(self, book_name: str, start_page: int, end_page: Optional[int] = None, save_pages_path: Optional[str] = None) -> Optional[Dict]:
        """
        Extract chords from specific page numbers.

        Args:
            book_name: Name of the book (without _index.json suffix)
            start_page: Starting page number
            end_page: Ending page number (if None, only process start_page)
            save_pages_path: Optional path to save extracted pages as PDF

        Returns:
            Dictionary with page info and extracted chords
        """
        # Load book index to get PDF filename
        book_index = self.load_book_index(book_name)
        if not book_index:
            return None

        if end_page is None:
            end_page = start_page

        print(f"\nExtracting from pages: {start_page}-{end_page}")

        # Get PDF path
        pdf_path = self.score_dir / book_index['filename']
        if not pdf_path.exists():
            print(f"Error: PDF not found: {pdf_path}")
            return None

        # Extract pages
        images = self.extract_pages_from_pdf(pdf_path, start_page, end_page)
        if not images:
            return None

        # Save extracted pages if requested
        if save_pages_path:
            self.save_images_as_pdf(images, Path(save_pages_path))

        # Extract chords from all pages
        all_chords = []
        for i, image in enumerate(images, start=start_page):
            print(f"Processing page {i}...")
            text = self.extract_text_from_image(image, i)
            chords = self.extract_chords_from_text(text)

            if chords:
                print(f"  Found {len(chords)} chord symbols: {', '.join(chords[:10])}{'...' if len(chords) > 10 else ''}")
                all_chords.extend(chords)

            # Add small delay for OLM to avoid rate limiting
            if self.use_olm:
                import time
                time.sleep(0.5)

        # Return result
        result = {
            'book': book_name,
            'pages': f"{start_page}-{end_page}",
            'chords': all_chords,
            'unique_chords': sorted(list(set(all_chords))),
            'total_chord_changes': len(all_chords),
            'ocr_method': 'OLM OCR (allenai/olmOCR-2-7B-1025)' if self.use_olm else 'Tesseract OCR'
        }

        return result

    def extract_chords_from_song(self, book_name: str, song_name: str, save_pages_path: Optional[str] = None) -> Optional[Dict]:
        """
        Main method: Extract chord sequence from a song.

        Args:
            book_name: Name of the book (without _index.json suffix)
            song_name: Name or partial name of the song

        Returns:
            Dictionary with song info and extracted chords, or None if not found
        """
        # Load book index
        book_index = self.load_book_index(book_name)
        if not book_index:
            return None

        # Find song
        song = self.find_song(book_index, song_name)
        if not song:
            print(f"Error: Song '{song_name}' not found in {book_name}")
            print(f"Available songs:")
            for s in book_index['songs']:
                print(f"  - {s['title']}")
            return None

        print(f"\nFound song: {song['title']}")
        print(f"Pages: {song['start_page']}-{song['end_page']}")

        # Get PDF path
        pdf_path = self.score_dir / book_index['filename']
        if not pdf_path.exists():
            print(f"Error: PDF not found: {pdf_path}")
            return None

        # Extract pages
        images = self.extract_pages_from_pdf(pdf_path, song['start_page'], song['end_page'])
        if not images:
            return None

        # Save extracted pages if requested
        if save_pages_path:
            self.save_images_as_pdf(images, Path(save_pages_path))

        # Extract chords from all pages
        all_chords = []
        for i, image in enumerate(images, start=song['start_page']):
            print(f"Processing page {i}...")
            text = self.extract_text_from_image(image, i)
            chords = self.extract_chords_from_text(text)

            if chords:
                print(f"  Found {len(chords)} chord symbols: {', '.join(chords[:10])}{'...' if len(chords) > 10 else ''}")
                all_chords.extend(chords)

            # Add small delay for OLM to avoid rate limiting
            if self.use_olm:
                import time
                time.sleep(0.5)

        # Return result
        result = {
            'book': book_name,
            'song_title': song['title'],
            'pages': f"{song['start_page']}-{song['end_page']}",
            'chords': all_chords,
            'unique_chords': sorted(list(set(all_chords))),
            'total_chord_changes': len(all_chords),
            'ocr_method': 'OLM OCR (allenai/olmOCR-2-7B-1025)' if self.use_olm else 'Tesseract OCR'
        }

        return result


def main():
    parser = argparse.ArgumentParser(
        description='Extract chord sequences from music sheet PDFs',
        epilog='''
Examples:
  # Extract by song name
  %(prog)s don_mclean "American Pie"

  # Extract by page number(s)
  %(prog)s don_mclean --page 14
  %(prog)s don_mclean --page 14 21

  # Use OLM OCR and save pages
  %(prog)s don_mclean "Vincent" --use-olm --save-pages vincent.pdf
        ''',
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument('book', help='Book name (e.g., "don_mclean")')
    parser.add_argument('song', nargs='?', help='Song name or partial name (e.g., "American Pie")')
    parser.add_argument('--page', nargs='+', type=int, metavar='N',
                        help='Page number(s): single page or range (e.g., --page 14 or --page 14 21)')
    parser.add_argument('-o', '--output', help='Output JSON file (optional)')
    parser.add_argument('--use-olm', action='store_true',
                        help='Use OLM OCR instead of Tesseract (requires DEEPINFRA_TOKEN)')
    parser.add_argument('--save-pages', help='Save extracted pages as PDF to this path (e.g., "extracted_pages.pdf")')
    parser.add_argument('--debug', action='store_true', help='Save debug images')

    args = parser.parse_args()

    # Validate arguments
    if not args.song and not args.page:
        parser.error("Must specify either song name or --page")
    if args.song and args.page:
        parser.error("Cannot specify both song name and --page")

    # Get DeepInfra token if using OLM
    deepinfra_token = None
    if args.use_olm:
        deepinfra_token = os.environ.get('DEEPINFRA_TOKEN')

    # Initialize extractor
    score_dir = Path(__file__).parent
    extractor = ChordExtractor(score_dir, use_olm=args.use_olm, deepinfra_token=deepinfra_token)

    # Extract chords based on mode
    if args.page:
        # Page mode
        start_page = args.page[0]
        end_page = args.page[1] if len(args.page) > 1 else None
        result = extractor.extract_chords_from_pages(args.book, start_page, end_page, save_pages_path=args.save_pages)
    else:
        # Song name mode
        result = extractor.extract_chords_from_song(args.book, args.song, save_pages_path=args.save_pages)

    if result:
        print("\n" + "="*60)
        title = result.get('song_title', f"Pages {result['pages']}")
        print(f"CHORD ANALYSIS: {title}")
        print("="*60)
        print(f"Book: {result['book']}")
        print(f"Pages: {result['pages']}")
        print(f"OCR Method: {result['ocr_method']}")
        print(f"\nTotal chord changes: {result['total_chord_changes']}")
        print(f"\nUnique chords ({len(result['unique_chords'])}):")
        print("  " + ", ".join(result['unique_chords']))
        print(f"\nChord sequence:")

        # Print chords in groups of 8 for readability
        chords = result['chords']
        for i in range(0, len(chords), 8):
            print("  " + " - ".join(chords[i:i+8]))

        # Save to file if requested
        if args.output:
            output_path = Path(args.output)
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(result, f, indent=2, ensure_ascii=False)
            print(f"\nResults saved to: {output_path}")

        return 0
    else:
        return 1


if __name__ == '__main__':
    sys.exit(main())
