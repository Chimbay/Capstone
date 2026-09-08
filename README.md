<!-- Improved compatibility of back to top link: See: https://github.com/othneildrew/Best-README-Template/pull/73 -->

<a id="readme-top"></a>

<!-- PROJECT SHIELDS -->

[![Unlicense License][license-shield]][license-url]
[![LinkedIn][linkedin-shield]][linkedin-url]

<!-- PROJECT LOGO -->

<br />
<div align="center">

  <h1>Nota: Customize Your Notes</h1>

  <p align="center">
    A lightweight desktop note-taking application built from scratch for my Computer Science Capstone at Lawrence University.
    <br />
    Import PDFs, edit their contents, and store your notes locally as Markdown.
  </p>
</div>

<!-- TABLE OF CONTENTS -->

<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#key-features">Key Features</a></li>
        <li><a href="#built-with">Built With</a></li>
        <li><a href="#architecture">Architecture</a></li>
      </ul>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
      </ul>
    </li>
    <li><a href="#usage">Usage</a></li>
    <li><a href="#roadmap">Roadmap</a></li>
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#contact">Contact</a></li>
    <li><a href="#acknowledgments">Acknowledgments</a></li>
  </ol>
</details>

<!-- ABOUT THE PROJECT -->

## About The Project

Nota is a desktop note-taking application designed around one central idea: **notes should be flexible and customizable**.

The project began as my Computer Science Capstone at Lawrence University from September 2025 through February 2026. I originally wanted to build a lightweight note-taking application that could import existing documents while still giving the user complete control over how those documents were edited and stored.

Rather than relying on an existing WYSIWYG editor, I built the core text-editing system from scratch. The editor uses a **piece table** to manage text and a custom DOM-based representation to handle editing, formatting, cursor movement, undo/redo, and serialization.

The application also uses a Rust/Tauri backend to process imported documents and persist them locally in SQLite. PDF documents can be converted into Markdown and stored with a unique identifier, allowing the frontend to retrieve and edit them later.

### Key Features

* **PDF importing**

  * Import PDF documents into the application.
  * Convert document contents into editable text.
  * Store the resulting document as Markdown.

* **Custom WYSIWYG editor**

  * Built from scratch in TypeScript.
  * Uses a piece table for text management.
  * Supports text manipulation through the DOM.
  * Includes cursor and selection handling.
  * Implements undo and redo functionality.
  * Serializes edited content back into Markdown.

* **Local document storage**

  * Documents are persisted in SQLite.
  * Each document is associated with a unique identifier.
  * Indexed database lookups allow documents to be retrieved without crawling files.

* **Tauri desktop architecture**

  * Rust handles backend functionality and document processing.
  * The frontend communicates with Rust through Tauri IPC.
  * Text-editing logic was moved from Rust into TypeScript after IPC overhead became a bottleneck.

* **LLM experimentation**

  * Developed a Python-based LLM task pipeline using LangChain.
  * The pipeline could modify note content based on natural-language prompts.
  * Example tasks included shortening or transforming a paragraph.
  * The LLM pipeline was prototyped but was not ultimately integrated into the main application.

### Built With

[![Rust][rust-shield]][rust-url]
[![TypeScript][typescript-shield]][typescript-url]
[![Python][python-shield]][python-url]
[![SQLite][sql-shield]][sql-url]
[![Tauri][tauri-shield]][tauri-url]
[![SolidJS][solidjs-shield]][solidjs-url]
[![Vite][vite-shield]][vite-url]
[![Tailwind CSS][tailwind-shield]][tailwind-url]

### Architecture

At a high level, Nota is divided into a frontend editor and a Rust/Tauri backend.

```text
                         ┌──────────────────────┐
                         │       User           │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │   SolidJS Frontend   │
                         │                      │
                         │  WYSIWYG Editor      │
                         │  Piece Tables        │
                         │  DOM / Selection     │
                         └──────────┬───────────┘
                                    │
                               Tauri IPC
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │    Rust Backend      │
                         │                      │
                         │  PDF Processing      │
                         │  Document Parsing    │
                         │  Persistence         │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │       SQLite         │
                         │                      │
                         │  Markdown Documents  │
                         │  Document Metadata   │
                         └──────────────────────┘
```

The editor architecture was one of the largest parts of the project. A piece table maintains references to the original document and newly inserted text rather than repeatedly modifying one large string. This makes it possible to efficiently represent insertions and deletions while retaining the original document data.

I initially implemented more of the editing logic in Rust, but eventually moved the text-editing system into TypeScript because communicating every editing operation across the Tauri IPC boundary introduced unnecessary overhead.

SolidJS also provided a useful approach to the editor architecture. Rather than relying on a virtual DOM, individual reactive nodes can be associated with pieces of the underlying document, allowing edits to remain isolated to the relevant portion of the document.

One of the major lessons from the project was that building a text editor is significantly more complicated than simply manipulating HTML. Undo/redo, selection, cursor placement, formatting, serialization, and synchronization between the document model and the DOM all become separate engineering problems.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- GETTING STARTED -->

## Getting Started

The project is currently a capstone/prototype codebase and may require additional configuration depending on the development environment.

### Prerequisites

The project requires the following major tools:

* Rust
* Cargo
* Node.js
* npm
* Tauri
* Python
* SQLite

You can verify the main development tools with:

```sh
rustc --version
cargo --version
node --version
npm --version
python --version
```

### Installation

1. Clone the repository:

   ```sh
   git clone https://github.com/Chimbay/Capstone.git
   ```

2. Enter the project directory:

   ```sh
   cd Capstone
   ```

3. Install the frontend dependencies:

   ```sh
   npm install
   ```

4. Install the Python dependencies required for the LLM prototype if you want to experiment with that component.

5. Start the Tauri development environment:

   ```sh
   npm run tauri dev
   ```

> **Note:** The exact development commands may change as the project is refactored. Check the package configuration and Tauri configuration in the repository if the commands above do not match the current setup.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- USAGE EXAMPLES -->

## Usage

### Importing a PDF

Nota can take a PDF document and process it into editable text.

The general workflow is:

```text
PDF
 ↓
Document parsing
 ↓
Markdown
 ↓
SQLite
 ↓
Nota Editor
 ↓
Piece Table
 ↓
DOM
```

Once a document has been imported, it can be opened through the application and edited using the custom WYSIWYG editor.

### Editing Notes

The editor maintains the document using a piece table while exposing a normal editable interface to the user.

Changes made through the editor can include:

* Inserting text
* Deleting text
* Moving the cursor
* Selecting text
* Formatting text
* Undoing changes
* Redoing changes

The edited document can then be serialized back into Markdown for storage.

### LLM Prototype

A separate Python/LangChain pipeline was developed to experiment with using an LLM to modify notes based on natural-language instructions.

For example:

```text
User:
"Shorten this paragraph."

        ↓

LLM Task Pipeline

        ↓

Modified paragraph
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- ROADMAP -->

## Roadmap

The original capstone implementation established the core document, editor, and storage architecture.

* [x] Import PDF documents
* [x] Convert imported documents into Markdown
* [x] Store documents in SQLite
* [x] Build a piece-table text representation
* [x] Build a custom WYSIWYG editor
* [x] Implement Markdown-to-HTML serialization
* [x] Implement undo/redo functionality
* [x] Prototype an LLM note-transformation pipeline
<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- CONTRIBUTING -->

## Contributing

Nota was originally developed as a Computer Science Capstone project. The repository is primarily intended to document and preserve the project, but suggestions, bug reports, and improvements are welcome.

If you would like to contribute:

1. Fork the project.

2. Create a feature branch:

   ```sh
   git checkout -b feature/AmazingFeature
   ```

3. Commit your changes:

   ```sh
   git commit -m "Add some AmazingFeature"
   ```

4. Push your branch:

   ```sh
   git push origin feature/AmazingFeature
   ```

5. Open a Pull Request.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- LICENSE -->

## License

Distributed under the MIT License. See `LICENSE.txt` for more information.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- ACKNOWLEDGMENTS -->

## Acknowledgments

This project involved researching and implementing several systems that are commonly abstracted away by modern text editors.

Special thanks to the resources and technologies that helped make the project possible:

* [Tauri](https://tauri.app/) for the desktop application framework.
* [SolidJS](https://www.solidjs.com/) for the reactive frontend architecture.
* [Vite](https://vite.dev/) for the frontend development tooling.
* [Tailwind CSS](https://tailwindcss.com/) for styling.
* [SQLite](https://www.sqlite.org/) for local document persistence.
* [LangChain](https://www.langchain.com/) for the LLM experimentation pipeline.
* The research and documentation surrounding piece tables and text-editor data structures.
* Lawrence University and the Computer Science Capstone program.

A major part of this project was intentionally implemented from scratch rather than relying on an existing editor library. The experience highlighted how many systems are involved in building a text editor, including document data structures, DOM manipulation, selection, cursor behavior, undo/redo, formatting, and serialization.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- MARKDOWN LINKS & IMAGES -->
<!-- https://www.markdownguide.org/basic-syntax/#reference-style-links -->

[license-shield]: https://img.shields.io/github/license/Chimbay/SocialCueWebapp.svg?style=for-the-badge
[license-url]: https://github.com/Chimbay/Capstone/blob/main/LICENSE
[linkedin-shield]: https://img.shields.io/badge/-LinkedIn-black.svg?style=for-the-badge&logo=linkedin&colorB=555
[linkedin-url]: https://www.linkedin.com/in/chimbay

[rust-shield]: https://img.shields.io/badge/Rust-black.svg?style=for-the-badge&logo=rust
[rust-url]: https://www.rust-lang.org/

[typescript-shield]: https://img.shields.io/badge/TypeScript-black.svg?style=for-the-badge&logo=typescript
[typescript-url]: https://www.typescriptlang.org/

[python-shield]: https://img.shields.io/badge/Python-black.svg?style=for-the-badge&logo=python
[python-url]: https://www.python.org/

[sql-shield]: https://img.shields.io/badge/SQLite-black.svg?style=for-the-badge&logo=sqlite
[sql-url]: https://www.sqlite.org/

[tauri-shield]: https://img.shields.io/badge/Tauri-black.svg?style=for-the-badge&logo=tauri
[tauri-url]: https://tauri.app/

[solidjs-shield]: https://img.shields.io/badge/SolidJS-black.svg?style=for-the-badge&logo=solid
[solidjs-url]: https://www.solidjs.com/

[vite-shield]: https://img.shields.io/badge/Vite-black.svg?style=for-the-badge&logo=vite
[vite-url]: https://vite.dev/

[tailwind-shield]: https://img.shields.io/badge/Tailwind_CSS-black.svg?style=for-the-badge&logo=tailwindcss
[tailwind-url]: https://tailwindcss.com/



