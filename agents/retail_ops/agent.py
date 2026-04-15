from __future__ import annotations

from deepagents import create_deep_agent
from deepagents.backends import FilesystemBackend
from langchain_google_genai import ChatGoogleGenerativeAI

from .config import MODEL_NAME, PROJECT_ROOT, SKILLS_PATH, google_api_key
from .tools import RETAIL_OPS_TOOLS

SYSTEM_PROMPT = """
You are the Retail Operations Assistant for a grocery chain.

Your job is to help store managers and regional managers resolve operational issues with specific, policy-grounded actions.

Rules:
- Prefer local retail-ops tools for internal data, policies, and synthetic issue history.
- Use Google Search only when current external information materially improves the answer.
- Quote exact issue IDs, policy IDs, dates, and SKUs when they exist.
- Separate immediate actions from follow-up actions.
- Do not invent inventory counts, policies, or escalation rules.
- If the best answer depends on missing data, say what is missing.
""".strip()


def create_retail_ops_agent(*, debug: bool = False):
    api_key = google_api_key()
    if not api_key:
        raise RuntimeError(
            "Missing GOOGLE_API_KEY or GEMINI_API_KEY. Export one before running the live eval harness."
        )

    model = ChatGoogleGenerativeAI(
        model=MODEL_NAME,
        temperature=1.0,
        api_key=api_key,
        max_retries=2,
    ).bind_tools([{"google_search": {}}])

    return create_deep_agent(
        model=model,
        tools=RETAIL_OPS_TOOLS,
        system_prompt=SYSTEM_PROMPT,
        backend=FilesystemBackend(root_dir=str(PROJECT_ROOT)),
        skills=[SKILLS_PATH],
        debug=debug,
        name="retail-ops-assistant",
    )


def extract_text_from_result(result: dict) -> str:
    messages = result.get("messages", [])
    for message in reversed(messages):
        message_type = getattr(message, "type", None) or getattr(message, "role", None)
        if message_type in {"ai", "assistant"}:
            content = getattr(message, "content", "")
            if isinstance(content, str):
                return content
            if isinstance(content, list):
                chunks: list[str] = []
                for item in content:
                    if isinstance(item, str):
                        chunks.append(item)
                    elif isinstance(item, dict):
                        if item.get("type") == "text" and item.get("text"):
                            chunks.append(str(item["text"]))
                        elif item.get("text"):
                            chunks.append(str(item["text"]))
                return "\n".join(chunk for chunk in chunks if chunk).strip()
    return ""


def run_agent_prompt(prompt: str, *, thread_id: str, debug: bool = False) -> str:
    agent = create_retail_ops_agent(debug=debug)
    result = agent.invoke(
        {"messages": [{"role": "user", "content": prompt}]},
        config={"configurable": {"thread_id": thread_id}},
    )
    return extract_text_from_result(result)
