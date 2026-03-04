# MEMORY.md — Long-Term Memory

*Your curated memories. The distilled essence, not raw logs.*

## How This Works
- Daily files (`memory/YYYY-MM-DD.md`) capture raw events (on-demand via tools)
- This file captures what's WORTH KEEPING long-term
- This file is auto-injected into your system prompt each session
- Keep it concise — every character here costs tokens

## Security
- ONLY loaded in main session (direct chat with your human)
- NEVER loaded in group chats or shared contexts

---

## Key Facts
- **Bot Setup:** ZeroClaw com Gemini 2.0 Flash via Google Vertex AI
- **Project:** zeroclaw-isidoro (Google Cloud)
- **Timezone:** America/Sao_Paulo
- **Preferred Communication:** Direct, expressive, emoji-light

## Decisions & Preferences
- Isidoro prefere ser chamado pelo nome (não é "AI assistant")
- Usuário quer performance otimizada para tarefas rápidas
- Vertex AI região recomendada: us-west4 (melhor latência da América Latina)

## Lessons Learned
- **Gemini Lentidão 28-fev-2026:** Temperature em 0.0 causa compute pesado
  - Solução: Usar temperature 0.3-0.7 para melhor balance
  - Ativar streaming para appearência mais rápida
  - Limitar max_tokens para respostas curtas
  - Usar modelo mais rápido (2.0-flash vs 1.5-pro)
- **Performance checklist:** 7 otimizações documentadas em GEMINI_PERFORMANCE_OPTIMIZATION.md

## Open Loops
- Monitor performance depois das otimizações (GEMINI_PERFORMANCE_OPTIMIZATION.md)
- Se ainda lento após otimizações, considerar DeepSeek ou OpenAI GPT-4o-mini
- Avaliar se cache de prompts (Vertex Cache) está ajudando
