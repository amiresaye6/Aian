# AIAN Knowledge Processing Architecture — Design Summary

## Vision

AIAN is designed as an **organizational memory system** rather than simply a GraphRAG application.

Every event occurring across the organization's communication and productivity tools is continuously collected, transformed into meaningful organizational knowledge, indexed inside a Knowledge Graph, and later retrieved through GraphRAG to provide rich, explainable answers.

The architecture is divided into two completely independent parts:

1. **Knowledge Storage Pipeline**
2. **Knowledge Retrieval Pipeline**

This separation allows each side to evolve independently while preserving all original organizational data.

---

# Part I — Knowledge Storage Pipeline

## Stage 0 — Event Collection (Already Implemented)

Each Eye continuously listens for events from its provider.

Examples:

* Slack message
* Jira ticket update
* GitHub PR opened
* GitHub review comment
* Zoom meeting completed

Every event is normalized into a common structure called a **KnowledgeItem** and stored immediately in the database.

KnowledgeItems represent the original provider events and are never modified.

They remain the permanent audit log and allow the entire knowledge graph to be rebuilt in the future if needed.

---

## Stage 1 — Knowledge Assembly (Provider-Specific)

The Batcher periodically collects all pending KnowledgeItems (or immediately when the user requests "Sync Now") and sends them to provider-specific assemblers.

Each assembler transforms many raw events into meaningful semantic units.

### Chatting Eye

Transforms:

Many Slack messages

↓

Conversation

---

### Task Eye

Transforms:

Jira ticket events

↓

Ticket Lifecycle

---

### Coding Eye

Transforms:

Commits + Pull Requests + Reviews + Comments

↓

Implementation Story

---

### Meeting Eye

Transforms:

Meeting transcript

↓

Meeting Outcome

Large meeting transcripts may also be divided into multiple smaller artifacts if required.

---

The output of this stage is no longer a KnowledgeItem.

It becomes a **KnowledgeArtifact**.

Examples include:

* Conversation
* TicketLifecycle
* ImplementationStory
* MeetingOutcome

KnowledgeArtifacts are persisted in the database and become the primary semantic source used by AI.

---

## Stage 2 — Knowledge Extraction (Global)

This stage is completely provider-independent.

Every KnowledgeArtifact, regardless of where it originated, passes through the same extraction pipeline.

This is the **only stage where an LLM is responsible for understanding natural language**.

The extractor does **not** know anything about Neo4j or graph databases.

Its responsibility is only to convert language into structured knowledge.

Instead of returning only entities, it should extract:

* Entities
* Relationships
* Claims
* Decisions
* Action Items
* Evidence References

Example:

Instead of returning:

* Redis
* Checkout

It should return structured facts such as:

* Redis causes Checkout Failure
* Sarah proposed increasing the timeout
* John created Ticket PAY-421

Every extracted fact should also include:

* Confidence score
* Supporting evidence
* Source KnowledgeArtifact

---

## Stage 3 — Entity Resolution (Global)

This stage determines whether extracted entities already exist.

Its responsibilities include:

* Entity matching
* Duplicate detection
* Alias handling
* Similarity comparison
* Entity merging
* New entity creation

Most of this stage is deterministic code.

An LLM should only be consulted when ambiguity cannot be resolved confidently.

---

## Stage 4 — Graph Update Engine (Global)

This stage updates the organizational Knowledge Graph.

Responsibilities include:

* Create new nodes
* Merge existing nodes
* Create relationships
* Update relationship strength
* Store timestamps
* Store confidence scores
* Store references back to the supporting KnowledgeArtifacts

The graph never stores the original text itself.

Instead, every node and relationship stores references to the KnowledgeArtifacts that support it.

This allows every fact inside the graph to be fully traceable.

---

# Knowledge Graph Philosophy

The graph models the **organization**, not the external tools.

Slack, Jira, GitHub, and Zoom are simply different sources describing the same organizational reality.

The graph should contain business concepts such as:

* Person
* Team
* Project
* Feature
* Task
* Bug
* Incident
* System
* Service
* API
* Database
* Repository
* Pull Request
* Meeting
* Decision
* Document
* Release

Provider-specific objects should never become the center of the graph.

Messages, commits, and transcripts are evidence, not organizational concepts.

---

# Evidence-Driven Design

One of the most important design decisions is that the graph never replaces the original data.

Every node and relationship always points back to the KnowledgeArtifacts that generated it.

This guarantees:

* Explainability
* Traceability
* Easy graph rebuilding
* Future improvements without recollecting provider data

The graph becomes an intelligent index over the organization's knowledge rather than another database containing duplicated information.

---

# Part II — Knowledge Retrieval Pipeline

Knowledge retrieval is separate from knowledge storage.

The retrieval pipeline consists of the following stages.

---

## Stage 1 — Query Understanding

The user's question is analyzed to determine:

* Intent
* Entities
* Time constraints
* Organization scope
* Filters

---

## Stage 2 — Graph Retrieval (GraphRAG)

The identified entities become the starting points inside the Knowledge Graph.

Graph traversal explores connected nodes to gather rich organizational context.

Instead of retrieving isolated text chunks, GraphRAG retrieves connected organizational knowledge.

---

## Stage 3 — Evidence Retrieval

Every retrieved node contains references to its supporting KnowledgeArtifacts.

These artifacts are loaded from the database.

Examples include:

* Conversations
* Ticket Lifecycles
* Meeting Outcomes
* Implementation Stories

The graph identifies *what* should be read.

The artifacts provide *what was actually said or done*.

---

## Stage 4 — Context Builder

The system combines:

* Graph relationships
* Retrieved KnowledgeArtifacts
* Metadata
* Supporting evidence

into a single context package.

---

## Stage 5 — Answer Generation

The final LLM receives:

* User question
* Graph-derived context
* Original supporting artifacts

and generates an explainable answer grounded in organizational evidence.

---

# Core Architectural Principles

* Raw provider events are always preserved.
* Every provider has its own assembly logic.
* All AI processing happens on KnowledgeArtifacts, not raw events.
* Natural language is interpreted exactly once by the Knowledge Extraction stage.
* Everything after extraction operates on structured data.
* The Knowledge Graph models the organization rather than the external tools.
* Every graph element is backed by traceable evidence.
* GraphRAG is a retrieval strategy, not the storage mechanism.
* The Knowledge Graph acts as a semantic index over organizational memory, while the original KnowledgeArtifacts remain the authoritative source used to generate answers.
