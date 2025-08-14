# epub Keyword Counter ✨

A sleek and powerful web application to parse an ePub file, count occurrences of specified keywords in each chapter, and update the table of contents with the counts. The modified ePub file can then be downloaded instantly.

![ePub Keyword Counter UI](https://i.imgur.com/example.png)  
*(Image placeholder: A screenshot of the app's clean interface would go here)*

---

## 🚀 Key Features

*   **Client-Side Processing**: All operations happen directly in your browser. Your files are never uploaded to a server, ensuring 100% privacy and security.
*   **Drag & Drop Interface**: Easily upload your `.epub` files with a modern drag-and-drop area or a traditional file picker.
*   **Advanced Keyword Search**:
    *   **Case-Insensitive**: `magic` will match `Magic`, `MAGIC`, etc.
    *   **Prefix Matching**: `magic` also finds `magical`, `magician`.
    *   **Single-Character Wildcard**: Use `*` to match any single character. For example, `wom*n` finds both `woman` and `women`.
*   **Automatic ToC Updates**: Automatically finds the Table of Contents (supports both ePub 2 `.ncx` and ePub 3 `nav.xhtml` formats) and appends the keyword counts to the relevant chapter titles.
*   **Instant Download**: Get your modified ePub file, ready to use on any compatible e-reader.
*   **Responsive Design**: A clean, modern interface that works beautifully on desktop and mobile devices.

---

## 🔧 How It Works

The application leverages the power of JavaScript libraries running in the browser to perform all its magic:

1.  **File Reading**: When you upload an `.epub` file (which is essentially a zip archive), the `JSZip` library is used to unzip it in memory.
2.  **ePub Parsing**: The app reads the `META-INF/container.xml` file to locate the main `.opf` (Package) file. The `.opf` file contains the book's metadata, a manifest of all included files, and the "spine" which defines the chapter order.
3.  **Keyword Counting**: It iterates through each chapter listed in the spine, reads its HTML content, strips out the HTML tags to get plain text, and then uses a dynamically generated Regular Expression to count all occurrences of your keywords.
4.  **ToC Modification**: The app identifies the Table of Contents file (`.ncx` for ePub2 or `nav.xhtml` for ePub3). It parses this XML/HTML file and injects the keyword counts next to the corresponding chapter titles.
5.  **Re-packaging**: Finally, `JSZip` re-packages all the original files along with the modified Table of Contents into a new `.epub` file, which is provided to you as a download link.

---

## 🔎 Search Rules Explained

The keyword search is designed to be flexible. Here's a quick guide:

- **Comma-Separated**: Enter multiple keywords separated by commas, e.g., `dragon, castle, sword`.
- **Prefix Matching**: The search automatically matches words that start with your keyword. A search for `king` will find `king`, `kings`, and `kingdom`.
- **Wildcard (`*`)**: The asterisk `*` acts as a wildcard for a single character. This is perfect for words with variations.
  - `wom*n` will match both `woman` and `women`.
  - `gr*y` will match both `gray` and `grey`.

---

## 🛠️ Technology Stack

*   **Frontend**: [React](https://react.dev/)
*   **Language**: [TypeScript](https://www.typescriptlang.org/)
*   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
*   **ePub Handling**: [JSZip](https://stuk.github.io/jszip/)
*   **DOM Parsing**: Native Web APIs (`DOMParser`, `XMLSerializer`)

---

## 📖 Usage

Using the app is simple:

1.  **Upload File**: Drag your `.epub` file onto the designated area, or click to browse and select it from your computer.
2.  **Enter Keywords**: Type your keywords into the input box, separated by commas.
3.  **Process**: Click the "Process ePub & Count Keywords" button.
4.  **Download**: Once processing is complete, a download button will appear. Click it to save your new, modified ePub file.
