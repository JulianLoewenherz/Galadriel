# Galadriel

**A living mirror for what you actually do.**

Galadriel is an open-source self-knowledge tool that connects to the apps where your real behavior already lives — your calendar, email, Claude conversations, docs, messages, code, music, health data, journals, and more — and weaves them into one normalized timeline of your life.

On top of that timeline, Galadriel gives an LLM a library of analysis tools it can call dynamically — and chain together — to surface the patterns that are hard to see from the inside: the asymmetries in how you treat people, the rituals you did not know you had, and the gaps between what you say and what you do.

It is not a personality test. It is not a productivity score. It is an evolving, evidence-backed reflection of your behavior that gets sharper the longer you use it.

> The goal is a specific feeling: **“I didn’t even realize I did that.”**  
> Regularly. Earned every time.

---

## Why Galadriel exists

Self-report is a weak signal.

Most tools for understanding ourselves are built around what we say about ourselves: personality quizzes, profile bios, journals, retrospectives, and goals. But much of who we are is visible in what we actually do, repeatedly, across thousands of small moments we barely notice.

That behavioral data already exists. It is just scattered across the apps we use every day.

Galadriel brings those traces together, normalizes them into a single timeline, and reflects them back with receipts.

---

## Core experience

Galadriel has four primary user-facing surfaces.

### 1. Timeline

The timeline is the substrate of the product: a unified, scrubbable record of the user’s digital day, week, and month.

Connected sources contribute events such as:

- meetings attended
- emails sent and received
- Claude conversations started
- Google Docs editing sessions
- messages exchanged
- commits made
- songs played
- walks taken
- sleep recorded
- app usage windows

Events are grouped into natural time windows rather than overly granular reconstructions. A writing session should appear as a coherent block, not as thousands of keystrokes. Each event remains traceable back to its source.

Users can zoom from a single day out to weeks or months, and every event becomes evidence that later insights can cite.

### 2. Daily card

At the end of each day, Galadriel produces one short card — no more than three sentences — that captures something true about the day.

Daily cards rotate between three modes:

- **Pure mirror:** “Here is what you did, and here is the pattern I noticed.”
- **Mirror plus question:** “Does this feel true to you?”
- **Mirror plus nudge:** “Try this small thing tomorrow.”

The daily card is a heartbeat, not the whole product. It creates a ritual and gives the project its voice.

### 3. Insights feed

The insights feed is a continuously updating stream of detected patterns, ordered by recency, confidence, and novelty.

Each insight should:

- name the pattern when a known concept exists
- show the specific events that produced the observation
- explain the underlying psychology in plain language
- include a confidence score and sample size
- suggest a small behavioral experiment when appropriate

Users can mark insights as:

- resonant
- off-base
- already knew
- want more like this

That feedback shapes future detection and helps Galadriel learn what kinds of reflections are useful.

### 4. Dashboard

The dashboard is for users who want to interrogate their own behavior as data.

It shows trends, ratios, rhythms, rates, month-over-month changes, attention allocation, goal drift, and other aggregate views of the timeline. The dashboard is more analytic than the daily card or insights feed, but it follows the same principle: every claim must be backed by evidence.

---

## Data layer

Galadriel normalizes data from many sources into a common event format.

A normalized event includes:

- timestamp
- source
- actor
- action
- target
- content summary
- evidence pointer
- confidence metadata where applicable

The product starts to feel magical when roughly five high-signal sources are connected, because that is when cross-source patterns become possible.

Priority launch adapters include:

- Google Calendar
- Gmail
- Claude conversation exports
- Google Docs revision history
- iMessage or Slack exports
- GitHub
- Spotify
- Apple Health or wearable data
- Obsidian, Day One, or another journal source
- desktop application focus and screen-time data

Adding new adapters should be a small, clear contribution path. Community adapters could support tools such as Strava, Things, Linear, bank transactions, browser history, or any other data source a user explicitly chooses to connect.

---

## Application activity and local computer context

Galadriel can also use local computer activity as another signal, when the user opts in.

On many operating systems it is possible to determine which application is currently focused, such as Discord, a browser, an editor, a terminal, or a music app. Depending on platform permissions, Galadriel can turn that into timeline events like:

- “Discord focused for 18 minutes”
- “VS Code active during a late-night coding session”
- “Calendar opened repeatedly before a difficult meeting”
- “Browser research followed by a Claude conversation and then a long email draft”

This should be captured as coarse activity windows rather than invasive screen recording. The goal is to understand rhythms and context, not to reconstruct private behavior at unnecessary resolution.

Possible sources include:

- operating-system screen time APIs
- accessibility APIs, with explicit permission
- active-window tracking
- browser history exports
- app usage summaries from system settings
- local-only event collectors

Because this data is sensitive, the default should be local-first, transparent, and user-controlled.

---

## Analysis tools

Galadriel ships with a library of analysis tools. Rather than running as a static pipeline, these tools are designed to be called by an LLM as it reasons over the user's data — dynamically, selectively, and in combination.

The LLM decides which tools to invoke, in what order, and how to chain their outputs together. A single question like “Why was last month hard?” might cause the model to call a response-time tool, then a sleep-pattern tool, then a meeting-density tool, then cross-reference the results to find a pattern none of the tools would have surfaced in isolation.

Tools are narrow and composable by design. Each one answers a specific question about the timeline; the intelligence lives in how they are combined.

### What the tools cover

The strongest analyses tend to fall into three categories.

**Asymmetries** — patterns where behavior differs meaningfully across people, contexts, or roles.

Examples:

- You respond to your boss in four hours and your sister in three days.
- You initiate very few meetings but accept most invitations.
- Your message length drops sharply in conversations with a specific person.
- You apologize repeatedly to people who rarely apologize back.

**Self-report versus observed gaps** — patterns where what the user says conflicts with what the timeline shows.

Examples:

- You journaled about feeling productive during weeks when your commit graph was unusually quiet.
- You said you did not care, then reread the email several times before replying.
- You told Claude you were fine while your sleep and heart-rate data suggested a harder week.

**Hidden rituals** — repeated sequences the user may not consciously notice.

Examples:

- You walk before every meeting with a particular person.
- You listen to the same songs before difficult conversations.
- You ask Claude “am I being unreasonable?” before sending hard emails.
- You commit code around midnight on Tuesdays.

### Tool output contract

Every analysis tool should return:

- a named pattern or candidate label
- the specific events used as evidence
- a confidence score
- a sample size
- time range covered
- a plain-language explanation
- optional behavioral nudge

This consistent structure is what allows the LLM to read one tool's output and decide intelligently what to call next.

Nothing should be asserted without inspectable evidence.

---

## LLM layer

A language model is the active reasoning core of Galadriel. It is not a post-processing step on top of a static pipeline — it is the thing doing the investigation.

### 1. Orchestrator and tool caller

The model drives analysis by deciding which tools to call, what parameters to pass, and how to interpret and combine their outputs. It can chain calls across multiple tools to build up a picture that no single tool could produce alone.

This means insights can be genuinely exploratory. The model might notice an unexpected result from one tool and use that as the basis for a follow-up call — the same way a thoughtful person would pull on a thread.

The model also handles signals that deterministic rules cannot easily capture: tone, conflict style, intent, emotional valence, and thematic similarity across sources. These are treated as first-class inputs that inform which tools to call and how to interpret the results.

### 2. Renderer

The model turns structured analysis outputs into the prose used in daily cards, insight explanations, and behavioral nudges.

### 3. Conversational interface

Users can ask questions of their timeline directly:

- “Why was last Tuesday so bad?”
- “When did I last feel good about work?”
- “What tends to happen before I avoid replying?”
- “What changed this month compared with last month?”

The model answers by calling analysis tools against the normalized timeline, chaining calls as needed, and citing the specific evidence it found. It should be transparent about which tools it used and what it looked at.

---

## Goals and values

Users can optionally define goals and values they care about, such as:

- staying focused on a specific project
- being more responsive to family
- sleeping earlier
- finishing what they start
- protecting creative time
- spending less time in reactive communication

Galadriel compares observed behavior against those stated intentions, surfacing both wins and drift.

But goals are optional. The system should also surface meaningful patterns the user never explicitly asked about, especially around health, attention, relationships, decision-making, and psychological tendencies — as long as the data has enough standing to support the observation.

---

## Feedback loop

Every insight includes lightweight feedback controls:

- **Resonant** — this felt true and useful
- **Off-base** — this missed or overreached
- **Already knew** — true, but not novel
- **Want more like this** — useful direction for future detection

These signals help tune future detection, adjust confidence thresholds, and personalize what Galadriel chooses to surface.

The longer a user uses Galadriel, the better it should get at knowing what they did not know they wanted to know.

---

## Product principles

### Receipts for everything

No claim without traceable evidence. Every pattern links back to the specific events that produced it.

### Calibrated, not overconfident

Insights include sample size, confidence, and uncertainty. If the system does not have enough data, it should say so.

### Time-aware by default

Patterns are tracked as trends, not snapshots. The interesting moments are often the drifts, reversals, and changes.

### Local-first

Behavioral data is among the most sensitive data a person owns. The default installation should run on the user’s own machine against their own data. Cloud inference should be opt-in and explicit.

### A mirror, not an oracle

Galadriel reflects what it sees. It does not diagnose, predict, or pretend to know things it cannot know. When it is wrong, the user can say so.

### Honest about what it is

Self-knowledge is a long project. Galadriel is one input to that project, not a replacement for therapy, trusted friends, reflection, or the work of paying attention to your own life.

---

## What good feels like

A user opens Galadriel on a Sunday evening after two months of use.

The daily card says they spent more time helping others ship this week than shipping their own work, then asks whether that felt good or bad.

The insights feed shows a new observation: across the last six weeks, days with more than four hours of meetings are also the days they later journal about feeling stuck. The system shows the evidence, explains the pattern, and suggests protecting the morning before the heaviest meeting day next week.

Then the user scrolls the timeline and notices that every difficult email they sent in the last month was preceded by a long Claude conversation.

They did not know they did that.

Now they do.

---

## Development status

Galadriel is currently a project specification and early open-source foundation. The intended architecture emphasizes:

- local-first data storage
- adapter-based ingestion
- normalized timeline events
- composable analysis tools the LLM calls dynamically
- LLM-driven orchestration over analysis tools
- user feedback loops
- transparent privacy controls

Contributions should preserve the core promise: **reflect real behavior with evidence, humility, and care.**

---

## Contributing

Good first contribution areas include:

- new data-source adapters
- analysis tool implementations
- local activity collectors
- timeline normalization utilities
- privacy and permissions UX
- insight rendering improvements
- dashboard visualizations
- documentation and examples

If you add an analysis tool or adapter, make sure it is explainable, inspectable, and respectful of user consent.

---

## License

License information has not been specified yet.
