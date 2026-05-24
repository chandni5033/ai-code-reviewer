
// const express = require("express");
// const cors = require("cors");
// require("dotenv").config();

// const axios = require("axios");
// const Groq = require("groq-sdk");

// const app = express();

// app.use(cors());
// app.use(express.json({ limit: "2mb" }));

// const groq = new Groq({
//   apiKey: process.env.GROQ_API_KEY,
// });

// // ─────────────────────────────────────────────
// // Rate limiter
// // ─────────────────────────────────────────────

// const rateLimitMap = new Map();

// function rateLimit(req, res, next) {

//   const ip = req.ip;

//   const now = Date.now();

//   const entry =
//     rateLimitMap.get(ip) || {
//       count: 0,
//       start: now,
//     };

//   if (now - entry.start > 60_000) {

//     rateLimitMap.set(ip, {
//       count: 1,
//       start: now,
//     });

//     return next();
//   }

//   if (entry.count >= 10) {

//     return res.status(429).json({
//       error:
//         "Rate limit exceeded. Wait a minute.",
//     });
//   }

//   entry.count++;

//   rateLimitMap.set(ip, entry);

//   next();
// }

// // ─────────────────────────────────────────────
// // Parse PR diff by file
// // ─────────────────────────────────────────────

// function parseDiffByFile(diff) {

//   const files = [];

//   const fileBlocks =
//     diff.split(/(?=^diff --git )/m);

//   for (const block of fileBlocks) {

//     if (!block.trim()) continue;

//     const fileMatch = block.match(
//       /^diff --git a\/.+ b\/(.+)/m
//     );

//     const filename = fileMatch
//       ? fileMatch[1]
//       : "unknown";

//     const ext = filename
//       .split(".")
//       .pop()
//       .toLowerCase();

//     files.push({
//       filename,
//       ext,
//       diff: block.slice(0, 4000),
//     });
//   }

//   return files;
// }

// // ─────────────────────────────────────────────
// // Extract only added code
// // ─────────────────────────────────────────────

// function extractRelevantCode(diff) {

//   return diff
//     .split("\n")
//     .filter((line) => {

//       return (
//         line.startsWith("+") &&
//         !line.startsWith("+++") &&
//         line.trim().length > 1
//       );
//     })
//     .map((line) => line.substring(1))
//     .join("\n")
//     .slice(0, 3000);
// }

// // ─────────────────────────────────────────────
// // Build AI prompt
// // ─────────────────────────────────────────────

// function buildPrompt(code, filename = null) {

//   const fileHint =
//     filename
//       ? `File: ${filename}\n\n`
//       : "";

//   const docsRule = filename
//     ? `If the file is .md, .mdx, .txt, or .rst return [].`
//     : `Analyze the source code carefully.`;

//   return `
// You are an expert software engineer reviewing code changes.

// ${fileHint}
// ${docsRule}

// Analyze the provided code carefully and identify REAL bugs, logical mistakes, runtime risks, performance issues, or unsafe behavior.

// IMPORTANT:
// - Focus on correctness and runtime behavior.
// - Report only issues you can reasonably justify from the code.
// - Do not invent hypothetical vulnerabilities.
// - Ignore formatting and stylistic preferences.
// - Prefer meaningful findings over excessive findings.
// - Similar symptoms caused by the same root problem should be merged into one issue.

// You SHOULD report:
// - incorrect logic
// - missing edge case handling
// - null pointer risks
// - incorrect indexing
// - infinite loops
// - wrong conditions
// - memory issues
// - incorrect return paths
// - out-of-bounds access
// - unsafe pointer usage
// - realistic performance problems

// You SHOULD NOT report:
// - formatting issues
// - naming conventions
// - speculative vulnerabilities
// - harmless maintainability opinions
// - standard library/framework patterns

// Severity guide:
// - High → crashes, undefined behavior, infinite loops, major correctness bugs
// - Medium → incorrect results, risky logic, performance concerns
// - Low → meaningful maintainability concerns

// Explain issues clearly:
// - what is wrong
// - why it fails
// - when it fails

// Return ONLY valid JSON array.

// Format:
// [
//   {
//     "severity": "High",
//     "category": "Bug",
//     "confidence": 95,
//     "line": 14,
//     "issue": "Removing head node is not handled correctly when n equals list size",
//     "fix": "Handle the case where n equals the list length before traversing",
//     "snippet": "temp->next = temp->next->next;"
//   }
// ]

// Code:
// ${code}
// `.trim();
// }

// // ─────────────────────────────────────────────
// // Review code with Groq
// // ─────────────────────────────────────────────

// async function reviewCode(
//   code,
//   filename = null
// ) {

//   const completion =
//     await groq.chat.completions.create({

//       messages: [
//         {
//           role: "user",
//           content: buildPrompt(
//             code,
//             filename
//           ),
//         },
//       ],

//       model: "llama-3.1-8b-instant",

//       temperature: 0,

//       seed: 42,

//       max_tokens: 1000,
//     });

//   const raw =
//     completion.choices[0].message.content
//       .replace(/```json/g, "")
//       .replace(/```/g, "")
//       .trim();

//   try {

//     let parsed = JSON.parse(raw);

//     if (!Array.isArray(parsed)) {
//       parsed = [];
//     }

//     parsed = parsed.map((item) => ({
//       ...item,
//       confidence:
//         Number(item.confidence) || 80,
//     }));

//     return parsed;

//   } catch (err) {

//     console.error(
//       "RAW AI RESPONSE:"
//     );

//     console.log(raw);

//     return [];
//   }
// }

// // ─────────────────────────────────────────────
// // POST /review
// // ─────────────────────────────────────────────

// app.post(
//   "/review",
//   rateLimit,
//   async (req, res) => {

//     try {

//       const { code } = req.body;

//       if (
//         !code ||
//         code.trim().length < 5
//       ) {

//         return res.status(400).json({
//           error: "No code provided.",
//         });
//       }

//       const review =
//         await reviewCode(code);

//       res.json({
//         review,
//         files: [],
//       });

//     } catch (err) {

//       console.error(err);

//       if (err.status === 429) {

//         return res.status(429).json({
//           error:
//             "Groq API rate limit reached. Please try again later.",
//         });
//       }

//       res.status(500).json({
//         error: "Review failed.",
//       });
//     }
//   }
// );

// // ─────────────────────────────────────────────
// // POST /fetch-pr
// // ─────────────────────────────────────────────

// app.post(
//   "/fetch-pr",
//   rateLimit,
//   async (req, res) => {

//     try {

//       const { prUrl } = req.body;

//       if (!prUrl) {

//         return res.status(400).json({
//           error:
//             "No PR URL provided.",
//         });
//       }

//       const match =
//         prUrl.match(
//           /github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/
//         );

//       if (!match) {

//         return res.status(400).json({
//           error:
//             "Invalid GitHub PR URL.",
//         });
//       }

//       const [
//         ,
//         owner,
//         repo,
//         pullNumber,
//       ] = match;

//       const headers = {
//         Accept:
//           "application/vnd.github.v3.diff",
//         "User-Agent":
//           "CodeGuard-AI",
//       };

//       if (
//         process.env.GITHUB_TOKEN
//       ) {

//         headers[
//           "Authorization"
//         ] =
//           `token ${process.env.GITHUB_TOKEN}`;
//       }

//       const apiUrl =
//         `https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}`;

//       const diffResponse =
//         await axios.get(apiUrl, {
//           headers,
//         });

//       const diff =
//         diffResponse.data;

//       const metaResponse =
//         await axios
//           .get(apiUrl, {
//             headers: {
//               ...headers,
//               Accept:
//                 "application/vnd.github.v3+json",
//             },
//           })
//           .catch(() => null);

//       const meta =
//         metaResponse?.data
//           ? {
//               title:
//                 metaResponse.data.title,
//               author:
//                 metaResponse.data.user
//                   ?.login,
//               additions:
//                 metaResponse.data
//                   .additions,
//               deletions:
//                 metaResponse.data
//                   .deletions,
//               changed_files:
//                 metaResponse.data
//                   .changed_files,
//               base:
//                 metaResponse.data
//                   .base?.ref,
//               head:
//                 metaResponse.data
//                   .head?.ref,
//             }
//           : null;

//       const files =
//         parseDiffByFile(diff);

//       const filesToReview =
//         files.slice(0, 3);

//       const fileReviews =
//         await Promise.all(

//           filesToReview.map(
//             async (f) => {

//               const cleanedCode =
//                 extractRelevantCode(
//                   f.diff
//                 );

//               const issues =
//                 await reviewCode(
//                   cleanedCode,
//                   f.filename
//                 ).catch(() => []);

//               return {
//                 filename:
//                   f.filename,
//                 issues,
//               };
//             }
//           )
//         );

//       const allIssues =
//         fileReviews.flatMap(
//           (fr) =>
//             fr.issues.map(
//               (issue) => ({
//                 ...issue,
//                 filename:
//                   fr.filename,
//               })
//             )
//         );

//       res.json({
//         diff,
//         review: allIssues,
//         files: fileReviews,
//         meta,
//       });

//     } catch (err) {

//       console.error(
//         "PR fetch error:",
//         err?.response?.data ||
//           err.message
//       );

//       const status =
//         err?.response?.status;

//       if (status === 404) {

//         return res.status(404).json({
//           error:
//             "PR not found. Is the repo public?",
//         });
//       }

//       if (status === 403) {

//         return res.status(403).json({
//           error:
//             "GitHub rate limit hit. Add GITHUB_TOKEN to .env",
//         });
//       }

//       if (status === 429) {

//         return res.status(429).json({
//           error:
//             "Groq API rate limit reached. Please wait and try again.",
//         });
//       }

//       res.status(500).json({
//         error:
//           "Failed to fetch or review PR.",
//       });
//     }
//   }
// );

// // ─────────────────────────────────────────────
// // Health check
// // ─────────────────────────────────────────────

// app.get("/health", (_, res) => {

//   res.json({
//     status: "ok",
//   });
// });

// // ─────────────────────────────────────────────
// // Start server
// // ─────────────────────────────────────────────

// app.listen(5000, () => {

//   console.log(
//     "✅ CodeGuard server running on http://localhost:5000"
//   );
// });
























const express = require("express");
const cors = require("cors");
require("dotenv").config();

const axios = require("axios");
const Groq = require("groq-sdk");

const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// ─────────────────────────────────────────────
// Rate limiter
// ─────────────────────────────────────────────

const rateLimitMap = new Map();

function rateLimit(req, res, next) {

  const ip = req.ip;

  const now = Date.now();

  const entry =
    rateLimitMap.get(ip) || {
      count: 0,
      start: now,
    };

  if (now - entry.start > 60_000) {

    rateLimitMap.set(ip, {
      count: 1,
      start: now,
    });

    return next();
  }

  if (entry.count >= 10) {

    return res.status(429).json({
      error:
        "Rate limit exceeded. Wait a minute.",
    });
  }

  entry.count++;

  rateLimitMap.set(ip, entry);

  next();
}

// ─────────────────────────────────────────────
// Parse PR diff by file
// ─────────────────────────────────────────────

function parseDiffByFile(diff) {

  const files = [];

  const fileBlocks =
    diff.split(/(?=^diff --git )/m);

  for (const block of fileBlocks) {

    if (!block.trim()) continue;

    const fileMatch = block.match(
      /^diff --git a\/.+ b\/(.+)/m
    );

    const filename = fileMatch
      ? fileMatch[1]
      : "unknown";

    const ext = filename
      .split(".")
      .pop()
      .toLowerCase();

    files.push({
      filename,
      ext,
      diff: block.slice(0, 4000),
    });
  }

  return files;
}

// ─────────────────────────────────────────────
// Extract only added code
// ─────────────────────────────────────────────

function extractRelevantCode(diff) {

  return diff
    .split("\n")
    .filter((line) => {

      return (
        line.startsWith("+") &&
        !line.startsWith("+++") &&
        line.trim().length > 1
      );
    })
    .map((line) => line.substring(1))
    .join("\n")
    .slice(0, 3000);
}

// ─────────────────────────────────────────────
// Build AI prompt
// ─────────────────────────────────────────────

function buildPrompt(code, filename = null) {

  const fileHint =
    filename
      ? `File: ${filename}\n\n`
      : "";

  const docsRule = filename
    ? `If the file is .md, .mdx, .txt, or .rst return [].`
    : `Analyze the source code carefully.`;

  return `
You are an expert software engineer reviewing code changes.

${fileHint}
${docsRule}

Analyze the provided code carefully and identify REAL bugs, logical mistakes, runtime risks, performance issues, or unsafe behavior.

IMPORTANT:
- Focus on correctness and runtime behavior.
- Report only issues you can reasonably justify from the code.
- Do not invent hypothetical vulnerabilities.
- Ignore formatting and stylistic preferences.
- Prefer meaningful findings over excessive findings.
- Similar symptoms caused by the same root problem should be merged into one issue.

You SHOULD report:
- incorrect logic
- missing edge case handling
- null pointer risks
- incorrect indexing
- infinite loops
- wrong conditions
- memory issues
- incorrect return paths
- out-of-bounds access
- unsafe pointer usage
- realistic performance problems

You SHOULD NOT report:
- formatting issues
- naming conventions
- speculative vulnerabilities
- harmless maintainability opinions
- standard library/framework patterns

Severity guide:
- High → crashes, undefined behavior, infinite loops, major correctness bugs
- Medium → incorrect results, risky logic, performance concerns
- Low → meaningful maintainability concerns

Explain issues clearly:
- what is wrong
- why it fails
- when it fails

Return ONLY valid JSON array.

Format:
[
  {
    "severity": "High",
    "category": "Bug",
    "confidence": 95,
    "line": 14,
    "issue": "Removing head node is not handled correctly when n equals list size",
    "impact": "This will cause a null pointer dereference crash when the input list has exactly one node.",
    "fix": "Handle the case where n equals the list length before traversing",
    "snippet": "temp->next = temp->next->next;"
  }
]

Code:
${code}
`.trim();
}

// ─────────────────────────────────────────────
// Generate AI summary
// ─────────────────────────────────────────────

async function generateSummary(issues) {

  if (!issues || issues.length === 0) {
    return "No major correctness or security issues detected. This code looks safe to merge.";
  }

  const highCount = issues.filter(i => i.severity === "High").length;
  const medCount  = issues.filter(i => i.severity === "Medium").length;
  const lowCount  = issues.filter(i => i.severity === "Low").length;

  const issueList = issues
    .map(i => `- [${i.severity}] ${i.issue}`)
    .join("\n");

  const prompt = `
You are a senior engineer. Given these code review findings, write a 2-sentence executive summary.
Mention the count of critical/warning issues and the main risk areas (e.g. null safety, async handling, memory).
Be direct and specific. Do not use bullet points. Plain text only.

Findings:
${issueList}

Counts: ${highCount} critical, ${medCount} warnings, ${lowCount} info.
`.trim();

  try {
    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0,
      max_tokens: 120,
    });

    return completion.choices[0].message.content.trim();
  } catch {
    return `Found ${highCount} critical issue${highCount !== 1 ? "s" : ""} and ${medCount} warning${medCount !== 1 ? "s" : ""}. Review carefully before merging.`;
  }
}

// ─────────────────────────────────────────────
// Review code with Groq
// ─────────────────────────────────────────────

async function reviewCode(
  code,
  filename = null
) {

  const completion =
    await groq.chat.completions.create({

      messages: [
        {
          role: "user",
          content: buildPrompt(
            code,
            filename
          ),
        },
      ],

      model: "llama-3.1-8b-instant",

      temperature: 0,

      seed: 42,

      max_tokens: 1000,
    });

  const raw =
    completion.choices[0].message.content
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

  try {

    let parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      parsed = [];
    }

    parsed = parsed.map((item) => ({
      ...item,
      confidence:
        Number(item.confidence) || 80,
    }));

    return parsed;

  } catch (err) {

    console.error(
      "RAW AI RESPONSE:"
    );

    console.log(raw);

    return [];
  }
}

// ─────────────────────────────────────────────
// POST /review
// ─────────────────────────────────────────────

app.post(
  "/review",
  rateLimit,
  async (req, res) => {

    try {

      const { code } = req.body;

      if (
        !code ||
        code.trim().length < 5
      ) {

        return res.status(400).json({
          error: "No code provided.",
        });
      }

      const review = await reviewCode(code);

      // #2 AI Summary
      const summary = await generateSummary(review);

      res.json({
        review,
        summary,
        files: [],
      });

    } catch (err) {

      console.error(err);

      if (err.status === 429) {

        return res.status(429).json({
          error:
            "Groq API rate limit reached. Please try again later.",
        });
      }

      res.status(500).json({
        error: "Review failed.",
      });
    }
  }
);

// ─────────────────────────────────────────────
// POST /fetch-pr
// ─────────────────────────────────────────────

app.post(
  "/fetch-pr",
  rateLimit,
  async (req, res) => {

    try {

      const { prUrl } = req.body;

      if (!prUrl) {

        return res.status(400).json({
          error:
            "No PR URL provided.",
        });
      }

      const match =
        prUrl.match(
          /github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/
        );

      if (!match) {

        return res.status(400).json({
          error:
            "Invalid GitHub PR URL.",
        });
      }

      const [
        ,
        owner,
        repo,
        pullNumber,
      ] = match;

      const headers = {
        Accept:
          "application/vnd.github.v3.diff",
        "User-Agent":
          "CodeGuard-AI",
      };

      if (
        process.env.GITHUB_TOKEN
      ) {

        headers[
          "Authorization"
        ] =
          `token ${process.env.GITHUB_TOKEN}`;
      }

      const apiUrl =
        `https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}`;

      const diffResponse =
        await axios.get(apiUrl, {
          headers,
        });

      const diff =
        diffResponse.data;

      const metaResponse =
        await axios
          .get(apiUrl, {
            headers: {
              ...headers,
              Accept:
                "application/vnd.github.v3+json",
            },
          })
          .catch(() => null);

      const meta =
        metaResponse?.data
          ? {
              title:
                metaResponse.data.title,
              author:
                metaResponse.data.user
                  ?.login,
              additions:
                metaResponse.data
                  .additions,
              deletions:
                metaResponse.data
                  .deletions,
              changed_files:
                metaResponse.data
                  .changed_files,
              base:
                metaResponse.data
                  .base?.ref,
              head:
                metaResponse.data
                  .head?.ref,
            }
          : null;

      const files =
        parseDiffByFile(diff);

      const filesToReview =
        files.slice(0, 3);

      const fileReviews =
        await Promise.all(

          filesToReview.map(
            async (f) => {

              const cleanedCode =
                extractRelevantCode(
                  f.diff
                );

              const issues =
                await reviewCode(
                  cleanedCode,
                  f.filename
                ).catch(() => []);

              return {
                filename:
                  f.filename,
                issues,
              };
            }
          )
        );

      const allIssues =
        fileReviews.flatMap(
          (fr) =>
            fr.issues.map(
              (issue) => ({
                ...issue,
                filename:
                  fr.filename,
              })
            )
        );

      // #2 AI Summary
      const summary = await generateSummary(allIssues);

      res.json({
        diff,
        review: allIssues,
        summary,
        files: fileReviews,
        meta,
      });

    } catch (err) {

      console.error(
        "PR fetch error:",
        err?.response?.data ||
          err.message
      );

      const status =
        err?.response?.status;

      if (status === 404) {

        return res.status(404).json({
          error:
            "PR not found. Is the repo public?",
        });
      }

      if (status === 403) {

        return res.status(403).json({
          error:
            "GitHub rate limit hit. Add GITHUB_TOKEN to .env",
        });
      }

      if (status === 429) {

        return res.status(429).json({
          error:
            "Groq API rate limit reached. Please wait and try again.",
        });
      }

      res.status(500).json({
        error:
          "Failed to fetch or review PR.",
      });
    }
  }
);

// ─────────────────────────────────────────────
// Health check
// ─────────────────────────────────────────────

app.get("/health", (_, res) => {

  res.json({
    status: "ok",
  });
});

// ─────────────────────────────────────────────
// Start server
// ─────────────────────────────────────────────

app.listen(5000, () => {

  console.log(
    "✅ CodeGuard server running on http://localhost:5000"
  );
});
