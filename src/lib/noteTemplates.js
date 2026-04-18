/**
 * Built-in note templates.
 * Each template is a string; {{TITLE}}, {{AUTHORS}}, {{YEAR}}, {{DOI}},
 * {{DATE}}, {{REVIEWER}} are replaced when a note is first created.
 * Every template MUST include ## ToThink and ## Tasks sections.
 */

const BODIES = {

  'free-form': `## Summary


## Key Points


## Quotes


## ToThink


## Tasks

`,

  'sq3r': `## Survey
<!-- Skim headings, figures, and abstract -->


## Questions
<!-- Questions you want the paper to answer -->
-

## Read
<!-- Detailed notes section by section -->


## Recite
<!-- Summarise each section in your own words without looking -->


## Review
<!-- Connect to other knowledge; critique; evaluate evidence -->


## ToThink


## Tasks

`,

  'pq4r': `## Preview
<!-- Skim the structure; what is this paper about? -->


## Questions
<!-- Form questions from each heading -->
-

## Read
<!-- Detailed notes -->


## Reflect
<!-- How does this connect to what you already know? -->


## Recite
<!-- Summarise key points from memory -->


## Review
<!-- Final synthesis and evaluation -->


## ToThink


## Tasks

`,

  'cornell': `## Notes
<!-- Right column: take notes during reading -->


## Cues
<!-- Left column: keywords, questions, and headings (fill after reading) -->


## Summary
<!-- Bottom row: distil the whole page in 2–3 sentences (fill after reading) -->


## ToThink


## Tasks

`,

  'soap': `## Subjective
<!-- What is the clinical question / patient population? -->


## Objective
<!-- What did the study measure? Design, N, intervention, outcomes -->


## Assessment
<!-- Are the results valid? What do they mean? -->


## Plan
<!-- How does this change practice? Next steps? -->


## ToThink


## Tasks

`,

  'casp': `## Is the study valid?
<!-- Screening: is there a clearly focused research question? -->


## What are the results?
<!-- Effect size, confidence intervals, p-values -->


## Will the results help locally?
<!-- Applicability; setting; patient relevance -->


## Limitations


## Bias Assessment


## ToThink


## Tasks

`,
};

/** Build the YAML frontmatter string for a new note. */
function buildFrontmatter(paper, summary, reviewerName) {
  const s = summary ?? {};
  const title   = s.title   || paper.title || '';
  const authors = Array.isArray(s.authors) ? s.authors : [];
  const year    = s.year    || 0;
  const doi     = s.doi     || '';
  const date    = paper.added_at || new Date().toISOString().split('T')[0];

  const authorsYaml = authors.length
    ? authors.map(a => `  - "${a.replace(/"/g, '\\"')}"`).join('\n')
    : '  []';

  return `---
title: "${title.replace(/"/g, '\\"')}"
authors:
${authorsYaml}
year: ${year}
doi: "${doi}"
tags: []
status: ${paper.status || 'unread'}
reviewer: "${reviewerName.replace(/"/g, '\\"')}"
added: ${date}
---

# ${title || paper.title}

`;
}

/**
 * Build the initial note content for a paper.
 * @param {string} templateName  - key from BODIES
 * @param {object} paper         - DB row
 * @param {object|null} summary  - parsed JSON summary (or null)
 * @param {string} reviewerName  - from settings
 */
export function buildNote(templateName, paper, summary = null, reviewerName = '') {
  const body = BODIES[templateName] ?? BODIES['free-form'];
  return buildFrontmatter(paper, summary, reviewerName) + body;
}

/** Names suitable for the Settings template selector */
export const TEMPLATE_OPTIONS = [
  { value: 'free-form', label: 'Free-form'               },
  { value: 'sq3r',      label: 'SQ3R'                    },
  { value: 'pq4r',      label: 'PQ4R'                    },
  { value: 'cornell',   label: 'Cornell Notes'            },
  { value: 'soap',      label: 'SOAP (clinical)'          },
  { value: 'casp',      label: 'CASP Critical Appraisal'  },
];
