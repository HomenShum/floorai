# Thank-You Email Draft — Post Technical Interview

**To:** Alexandra Bacalan  
**Subject:** Thank You - Technical Interview Follow-Up & Updated Repo

---

Hi Alexandra,

Thank you for taking the time to walk through the thought process and tradeoff considerations together during yesterday's technical interview. I genuinely enjoyed the depth of the conversation, and it pushed me to refine my perspective on several fronts.

Three discussion points in particular stuck with me and shaped how I continued building after our session:

**1. Regional variability in store operations**

Your point about how different stores face fundamentally different issue profiles — whether driven by local population density, seasonal weather patterns, or supply chain geography — reinforced why this system cannot rely on a single flat retrieval model. A store in Phoenix dealing with HVAC failures during summer heat waves has a completely different operational context from a store in the Northeast managing winter staffing shortages. That insight directly influenced how the agent scopes its evidence retrieval by store context and why the regional manager view synthesizes cross-store patterns rather than treating each store identically.

**2. Database selection: pgvector, Chroma, Pinecone, Qdrant, vs. Convex**

Walking through the vector database landscape together was valuable. My initial instinct was pgvector for its SQL familiarity and co-located vector search, but as we discussed, the real requirement here was an operational workspace — not a retrieval-first product. Convex won out because it natively handles relational data, real-time subscriptions, file storage, and vector search in one backend, which eliminated the need to coordinate multiple services for a prototype that needed to ship fast and stay inspectable. That said, your questions about dedicated vector engines like Qdrant pushed me to document exactly when and why you would migrate retrieval to a specialized system as the corpus scales. That tradeoff table is now in the README.

**3. Production evaluation with GraphRAG and continuous monitoring**

The discussion about running the system against a golden dataset built from cleaned historical closed tickets was the most forward-looking part of our conversation. Since the interview, I researched and documented a production roadmap in the repo that covers: using GraphRAG with Neo4j for multi-hop knowledge retrieval (community detection via the Leiden algorithm for entity clustering), incremental delta-diff graph updates using Neo4j's MERGE and CDC capabilities so the knowledge graph stays current without full reindexes, and a continuous evaluation loop where new agent responses are scored against the golden dataset using LLM-as-judge, with drift detection to flag when the graph or agent quality degrades over time.

I have updated the GitHub repository with these additions:

- **Production Roadmap** section in the README covering GraphRAG architecture, delta-diff graph maintenance, golden dataset evaluation pipeline, and observability
- **Updated tradeoff documentation** reflecting our discussion points
- **Working prototype** deployed at https://getfloorai.vercel.app with the full store manager, regional manager, and group chat surfaces
- **Demo video** and updated slide deck in the repo

Repository: https://github.com/hshum2018/perficient_interview

Thank you again for the thoughtful conversation. The challenge pushed me to think more carefully about the gap between a working prototype and a production-ready operational AI system, and I am grateful for that perspective.

Best regards,  
Homen Shum
