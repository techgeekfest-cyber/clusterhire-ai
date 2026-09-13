# ClusterHire AI

AI-Powered Candidate Discovery & Hiring Intelligence Platform

ClusterHire is a full-stack hiring intelligence platform designed to make candidate discovery and ranking more transparent, explainable, and configurable.

Instead of treating candidate ranking as a black box, ClusterHire evaluates candidates across multiple dimensions, allows recruiters to dynamically adjust ranking priorities, and explains why candidates receive their scores.

## 🚀 Live Demo

https://recruit-harmony-desk.lovable.app/

## ✨ Key Features

### 🧠 Explainable Candidate Ranking

ClusterHire ranks candidates using four major dimensions:

- Skill Alignment
- Experience Relevance
- Skill Recency
- Evidence Strength

Each candidate receives an overall weighted score along with an explanation of the factors contributing to that score.

The system can identify:

- Matched skills
- Skill depth
- Missing or weak skills
- Experience relevance
- Skill recency
- Evidence gaps
- Insufficient evidence

The ranking system avoids making unsupported assumptions about a candidate's background.

### ⚖️ Dynamic Ranking Weights

Recruiters can adjust the importance of each ranking dimension using interactive sliders.

When the weights change:

- Candidate scores are recalculated
- Candidate rankings update dynamically
- Other weights are automatically rebalanced
- Ranking movements are displayed
- The system explains which weighting changes influenced candidate movement

This allows recruiters to adapt the ranking process to different hiring priorities.

### 👥 Candidate Comparison

Compare 2–3 candidates side by side to understand differences in:

- Overall score
- Skill alignment
- Experience relevance
- Skill recency
- Evidence strength

### 📊 Hiring Analytics

ClusterHire includes recruitment analytics and hiring funnel views to provide an overview of candidate pipelines and recruitment activity.

### 🔄 Hiring Pipeline

Manage candidates across different stages of the recruitment process with a structured hiring pipeline.

### 🤖 AI-Powered Recruiting Workspace

The platform includes an AI-assisted recruiting workspace designed to support recruiter workflows and candidate discovery.

### 🔐 Authentication

Authenticated access is integrated into the application to provide a structured recruiting workspace.

### 📱 Responsive Interface

The application is designed to work across desktop and mobile screen sizes.

---

## 🏗️ System Architecture

ClusterHire follows a full-stack architecture with the backend serving as the authoritative ranking engine.

```text
Candidate Data
      ↓
Candidate Mapping / Data Access
      ↓
Ranking Engine
      ↓
Feature & Evidence Analysis
      ↓
Weighted Candidate Score
      ↓
Candidate Ranking
      ↓
Percentile / Tier
      ↓
Explainability & Ranking Movement
      ↓
Frontend Visualization
