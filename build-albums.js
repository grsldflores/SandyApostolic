// Builds photos/albums.json from the folders inside photos/.
// Runs automatically on every Netlify deploy (see netlify.toml).
//
// How to add an album:
//   1. In GitHub, create a folder inside "photos", for example:
//        photos/2026-10-04 Ladies Early Morning Service/
//   2. Upload the pictures into that folder (.jpg, .jpeg, .png, .webp, .gif).
//   3. Optional: name one picture "cover.jpg" to use it as the album cover.
//   The date at the start of the folder name sets the order (newest first)
//   and is shown under the album title.

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "photos");
const IMAGE = /\.(jpe?g|png|webp|gif)$/i;

function slugify(s) {
  return s
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "album";
}

if (!fs.existsSync(ROOT)) fs.mkdirSync(ROOT);

const used = new Set();
const albums = fs.readdirSync(ROOT, { withFileTypes: true })
  .filter((d) => d.isDirectory() && !d.name.startsWith("."))
  .map((d) => {
    const folder = d.name;
    const files = fs.readdirSync(path.join(ROOT, folder))
      .filter((f) => IMAGE.test(f))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    if (!files.length) return null;

    const m = folder.match(/^(\d{4}-\d{2}-\d{2})[\s_-]*(.*)$/);
    const date = m ? m[1] : null;
    const title = (m ? m[2] : folder).replace(/[_]+/g, " ").trim() || folder;

    let slug = slugify((date ? date + "-" : "") + title);
    while (used.has(slug)) slug += "-2";
    used.add(slug);

    const cover = files.find((f) => /^cover\./i.test(f)) || files[0];
    const photos = [cover, ...files.filter((f) => f !== cover)];
    return { slug, title, date, folder, cover, photos };
  })
  .filter(Boolean)
  .sort((a, b) => (b.date || "").localeCompare(a.date || "") || a.title.localeCompare(b.title));

fs.writeFileSync(path.join(ROOT, "albums.json"), JSON.stringify({ albums }, null, 2));
console.log(`albums.json written: ${albums.length} album(s), ${albums.reduce((n, a) => n + a.photos.length, 0)} photo(s)`);
