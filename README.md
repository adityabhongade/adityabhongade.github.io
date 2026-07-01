# Academic Portfolio Site

A dark-themed, plain-background academic portfolio site inspired by the
reference design, built with plain HTML/CSS/JS (no build step needed).

## Structure

- `index.html` – main page (Bio, Publications, Talks, News, Experience, Projects, Teaching)
- `style.css` – dark theme styling
- `script.js` – loads content from JSON and BibTeX files below and injects it
- `pubs.bib` – Publications section
- `talks.json` – Talks section
- `updates.json` – News section
- `experience.json` – Experience section
- `projects.json` – Projects section
- `teaching.json` – Teaching section
- `photos/profile.jpg` – add your profile photo here (placeholder shown until you add it)
- `cv.pdf` – add your CV here for the "Download CV" button

## Editing content

You don't need to touch the HTML/JS to update content — just edit the JSON
files with your own papers, talks, news, experience, projects, and teaching
entries. Each is a simple array of objects; follow the existing examples.

## Running locally

Because the page uses `fetch()` to load JSON, opening `index.html` directly
via `file://` may block requests in some browsers. Serve it locally instead:

```
python3 -m http.server 8000
```

then open http://localhost:8000

## Deploying to GitHub Pages

1. Replace the contents of your `adityabhongade.github.io` repo with these files
   (keep the repo name so GitHub Pages continues to serve it at
   `https://adityabhongade.github.io`).
2. Commit and push to the `stable` (or `main`) branch used for Pages.
3. Add your real photo to `photos/profile.jpg` and your CV to `cv.pdf`.
4. Edit the JSON files with your real bio, papers, talks, news, experience,
   projects, and teaching info.
