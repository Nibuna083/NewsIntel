import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import Database from "better-sqlite3";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("newsintel.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    content TEXT,
    url TEXT,
    problem_type TEXT,
    event TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS causal_mappings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    problem_type TEXT,
    event TEXT,
    root_cause TEXT,
    frequency INTEGER DEFAULT 1,
    UNIQUE(problem_type, event, root_cause)
  );

  CREATE TABLE IF NOT EXISTS entities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_id INTEGER,
    entity_type TEXT,
    entity_value TEXT,
    FOREIGN KEY(article_id) REFERENCES articles(id)
  );
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Proxy for scraping (Gemini can handle the HTML, but we need to fetch it)
  app.get("/api/scrape", async (req, res) => {
    const { url } = req.query;
    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "URL is required" });
    }
    try {
      const response = await fetch(url);
      const html = await response.text();
      res.json({ html });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch URL" });
    }
  });

  // Save analysis results
  app.post("/api/save-analysis", (req, res) => {
    const { title, content, url, problemType, event, rootCauses, entities } = req.body;

    try {
      const insertArticle = db.prepare(`
        INSERT INTO articles (title, content, url, problem_type, event)
        VALUES (?, ?, ?, ?, ?)
      `);
      const articleResult = insertArticle.run(title, content, url, problemType, event);
      const articleId = articleResult.lastInsertRowid;

      // Save entities
      const insertEntity = db.prepare(`
        INSERT INTO entities (article_id, entity_type, entity_value)
        VALUES (?, ?, ?)
      `);
      for (const entity of entities) {
        insertEntity.run(articleId, entity.type, entity.value);
      }

      // Update causal mappings
      const upsertMapping = db.prepare(`
        INSERT INTO causal_mappings (problem_type, event, root_cause, frequency)
        VALUES (?, ?, ?, 1)
        ON CONFLICT(problem_type, event, root_cause) DO UPDATE SET
        frequency = frequency + 1
      `);
      for (const cause of rootCauses) {
        upsertMapping.run(problemType, event, cause);
      }

      res.json({ success: true, articleId });
    } catch (error) {
      console.error("Database error:", error);
      res.status(500).json({ error: "Failed to save analysis" });
    }
  });

  // Get knowledge base stats
  app.get("/api/stats", (req, res) => {
    try {
      const mappings = db.prepare("SELECT * FROM causal_mappings ORDER BY frequency DESC").all();
      const problemTypes = db.prepare("SELECT problem_type, COUNT(*) as count FROM articles GROUP BY problem_type").all();
      const recentArticles = db.prepare("SELECT * FROM articles ORDER BY created_at DESC LIMIT 5").all();
      
      res.json({ mappings, problemTypes, recentArticles });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
